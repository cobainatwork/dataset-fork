/**
 * 圖片資料集生成任務處理器
 * 負責非同步處理圖片資料集生成任務，獲取所有未生成答案的圖片問題並批次處理
 */

import { PrismaClient } from '@prisma/client';
import { processInParallel } from '@/lib/util/async';
import { updateTask } from './index';
import { getTaskConfig } from '@/lib/db/projects';
import imageService from '@/lib/services/images';
import logger from '@/lib/util/logger';

const prisma = new PrismaClient();

/**
 * 處理圖片資料集生成任務
 * 查詢未生成答案的圖片問題並批次處理
 * @param {Object} task 任務物件
 * @returns {Promise<void>}
 */
export async function processImageDatasetGenerationTask(task) {
  try {
    console.log(`Starting image dataset generation task: ${task.id}`);

    // 解析模型資訊
    let modelInfo;
    try {
      modelInfo = JSON.parse(task.modelInfo);
    } catch (error) {
      throw new Error(`Failed to parse model info: ${error.message}`);
    }

    const projectId = task.projectId;

    // 1. 查詢未生成答案的圖片問題
    console.log(`Starting image dataset generation for project ${projectId}`);
    const imageQuestionsWithoutAnswers = await prisma.questions.findMany({
      where: {
        projectId,
        answered: false,
        imageId: { not: null } // 只查詢圖片問題
      }
    });

    // 如果沒有需要處理的問題，直接完成任務
    if (imageQuestionsWithoutAnswers.length === 0) {
      await updateTask(task.id, {
        status: 1,
        completedCount: 0,
        totalCount: 0,
        detail: 'No image questions to process',
        note: '',
        endTime: new Date()
      });
      return;
    }

    // 獲取任務配置，包括併發限制
    const taskConfig = await getTaskConfig(projectId);
    const concurrencyLimit = taskConfig?.concurrencyLimit || 2;

    // 更新任務總數
    const totalCount = imageQuestionsWithoutAnswers.length;
    await updateTask(task.id, {
      totalCount,
      detail: `Image questions to process: ${totalCount}`,
      note: ''
    });

    // 2. 批次處理每個圖片問題
    let successCount = 0;
    let errorCount = 0;
    let totalDatasets = 0;
    let latestTaskStatus = 0;

    // 單個圖片問題處理函式
    const processImageQuestion = async question => {
      try {
        // 如果任務已經被標記為失敗或已中斷，不再繼續處理
        const latestTask = await prisma.task.findUnique({ where: { id: task.id } });
        if (latestTask.status === 2 || latestTask.status === 3) {
          latestTaskStatus = latestTask.status;
          return;
        }

        // 呼叫圖片資料集生成服務
        await imageService.generateDatasetForImage(projectId, question.imageId, question, {
          model: modelInfo,
          language: task.language
        });

        // 增加成功計數
        successCount++;
        totalDatasets++;

        // 更新任務進度
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, datasets generated: ${totalDatasets}`
        });

        return { success: true, questionId: question.id };
      } catch (error) {
        console.error(`Error processing image question ${question.id}:`, error);
        errorCount++;

        // 更新任務進度
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, datasets generated: ${totalDatasets}`
        });

        return { success: false, questionId: question.id, error: error.message };
      }
    };

    // 並行處理所有圖片問題
    await processInParallel(
      imageQuestionsWithoutAnswers,
      processImageQuestion,
      concurrencyLimit,
      async (completed, total) => {
        console.log(`Image dataset generation progress: ${completed}/${total}`);
      }
    );

    if (!latestTaskStatus) {
      // 任務完成，更新狀態
      const finalStatus = errorCount > 0 && successCount === 0 ? 2 : 1;
      const finalNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, datasets generated: ${totalDatasets}`;
      await updateTask(task.id, {
        status: finalStatus,
        completedCount: successCount + errorCount,
        detail: '',
        note: finalNote,
        endTime: new Date()
      });
    }

    console.log(`Image dataset generation task completed: ${task.id}`);
  } catch (error) {
    console.error(`Image dataset generation task failed: ${task.id}`, error);
    await updateTask(task.id, {
      status: 2,
      detail: `Processing failed: ${error.message}`,
      note: `Processing failed: ${error.message}`
    });
  }
}
