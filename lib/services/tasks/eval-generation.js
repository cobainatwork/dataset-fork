/**
 * 評估資料集批次生成任務處理服務
 */

import { PrismaClient } from '@prisma/client';
import { processInParallel } from '@/lib/util/async';
import { updateTask } from './index';
import { getTaskConfig } from '@/lib/db/projects';
import { generateEvalQuestionsForChunk } from '@/lib/services/eval';

const prisma = new PrismaClient();

/**
 * 處理評估資料集批次生成任務
 * @param {object} task - 任務物件
 * @returns {Promise<void>}
 */
export async function processEvalGenerationTask(task) {
  try {
    console.log(`Starting eval dataset generation task: ${task.id}`);

    // 解析模型資訊
    let modelInfo;
    try {
      modelInfo = JSON.parse(task.modelInfo);
    } catch (error) {
      throw new Error(`Failed to parse model info: ${error.message}`);
    }

    // 獲取專案配置
    const taskConfig = await getTaskConfig(task.projectId);
    const concurrencyLimit = taskConfig?.concurrencyLimit || 2;

    // 1. 查詢所有還沒有生成評估題目的文字塊
    // 先獲取所有文字塊
    const allChunks = await prisma.chunks.findMany({
      where: {
        projectId: task.projectId,
        // 過濾掉特殊文字塊
        NOT: {
          name: {
            in: ['Image Chunk', 'Distilled Content']
          }
        }
      }
    });

    if (allChunks.length === 0) {
      console.log(`No chunks available for eval question generation in project ${task.projectId}`);
      await updateTask(task.id, {
        status: 1,
        completedCount: 0,
        totalCount: 0,
        note: 'No chunks available for eval question generation'
      });
      return;
    }

    // 查詢已經生成過評估題目的文字塊ID
    const chunksWithEval = await prisma.evalDatasets.findMany({
      where: {
        projectId: task.projectId
      },
      select: {
        chunkId: true
      },
      distinct: ['chunkId']
    });

    const chunkIdsWithEval = new Set(chunksWithEval.map(item => item.chunkId).filter(Boolean));

    // 過濾出還沒有生成評估題目的文字塊
    const chunks = allChunks.filter(chunk => !chunkIdsWithEval.has(chunk.id));

    if (chunks.length === 0) {
      console.log(`All chunks already have eval questions for project ${task.projectId}`);
      await updateTask(task.id, {
        status: 1,
        completedCount: 0,
        totalCount: 0,
        note: 'All chunks already have eval questions'
      });
      return;
    }

    // 更新任務總數
    const totalCount = chunks.length;
    await updateTask(task.id, {
      totalCount,
      detail: `Chunks to process: ${totalCount}`
    });

    // 2. 批次處理每個文字塊
    let successCount = 0;
    let errorCount = 0;
    let totalQuestionsGenerated = 0;
    let latestTaskStatus = 0;

    // 單個文字塊處理函式
    const processChunk = async chunk => {
      try {
        // 如果任務已經被標記為失敗或已中斷，不再繼續處理
        const latestTask = await prisma.task.findUnique({ where: { id: task.id } });
        if (latestTask.status === 2 || latestTask.status === 3) {
          latestTaskStatus = latestTask.status;
          return;
        }

        const result = await generateEvalQuestionsForChunk(task.projectId, chunk.id, {
          model: modelInfo,
          language: task.language || 'zh-CN'
        });

        console.log(
          `Chunk ${chunk.id} eval questions generated. Count: ${result.total}, breakdown: ${JSON.stringify(result.breakdown)}`
        );

        // 增加成功計數
        successCount++;
        totalQuestionsGenerated += result.total || 0;

        // 更新任務進度
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, questions generated: ${totalQuestionsGenerated}`
        });

        return { success: true, chunkId: chunk.id, result };
      } catch (error) {
        console.error(`Error processing chunk ${chunk.id}:`, error);
        errorCount++;

        // 更新任務進度
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, questions generated: ${totalQuestionsGenerated}`
        });

        return { success: false, chunkId: chunk.id, error: error.message };
      }
    };

    // 並行處理所有文字塊，使用任務設定中的併發限制
    await processInParallel(chunks, processChunk, concurrencyLimit, async (completed, total) => {
      console.log(`Eval dataset generation progress: ${completed}/${total}`);
    });

    if (!latestTaskStatus) {
      // 任務完成，更新狀態
      const finalStatus = errorCount > 0 && successCount === 0 ? 2 : 1; // 如果全部失敗，標記為失敗；否則標記為完成
      const finalNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, questions generated: ${totalQuestionsGenerated}`;
      await updateTask(task.id, {
        status: finalStatus,
        completedCount: successCount + errorCount,
        detail: '',
        note: finalNote,
        endTime: new Date()
      });
    }

    console.log(`Eval dataset generation task completed: ${task.id}`);
  } catch (error) {
    console.error(`Eval dataset generation task failed: ${task.id}`, error);
    await updateTask(task.id, {
      status: 2,
      detail: `Processing failed: ${error.message}`,
      note: `Processing failed: ${error.message}`
    });
  }
}
