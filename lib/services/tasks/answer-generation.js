/**
 * 答案生成任務處理器
 * 負責非同步處理答案生成任務，獲取所有未生成答案的問題並批次處理
 */

import { PrismaClient } from '@prisma/client';
import { processInParallel } from '@/lib/util/async';
import { updateTask } from './index';
import datasetService from '@/lib/services/datasets';
import { getTaskConfig } from '@/lib/db/projects';

const prisma = new PrismaClient();

/**
 * 處理答案生成任務
 * 查詢未生成答案的問題並批次處理
 * @param {Object} task 任務物件
 * @returns {Promise<void>}
 */
export async function processAnswerGenerationTask(task) {
  try {
    console.log(`Starting answer generation task: ${task.id}`);

    // 解析模型資訊
    let modelInfo;
    try {
      modelInfo = JSON.parse(task.modelInfo);
    } catch (error) {
      throw new Error(`Failed to parse model info: ${error.message}`);
    }

    // 從任務物件直接獲取專案 ID
    const projectId = task.projectId;

    // 1. 查詢未生成答案的問題
    console.log(`Starting answer generation for project ${projectId}`);
    const questionsWithoutAnswers = await prisma.questions.findMany({
      where: {
        projectId,
        answered: false, // 未生成答案的問題
        imageId: null
      }
    });

    // 如果沒有需要處理的問題，直接完成任務
    if (questionsWithoutAnswers.length === 0) {
      await updateTask(task.id, {
        status: 1, // 1 表示完成
        detail: 'No questions to process',
        note: '',
        endTime: new Date()
      });
      return;
    }

    // 獲取任務配置，包括併發限制
    const taskConfig = await getTaskConfig(projectId);
    const concurrencyLimit = taskConfig.concurrencyLimit || 3;

    // 更新任務總數
    const totalCount = questionsWithoutAnswers.length;
    await updateTask(task.id, {
      totalCount,
      detail: `Questions to process: ${totalCount}`,
      note: ''
    });

    // 2. 批次處理每個問題
    let successCount = 0;
    let errorCount = 0;
    let totalDatasets = 0;
    let latestTaskStatus = 0;
    const errorList = [];

    // 單個問題處理函式
    const processQuestion = async question => {
      try {
        // 如果任務已經被標記為失敗或已中斷，不再繼續處理
        const latestTask = await prisma.task.findUnique({ where: { id: task.id } });
        if (latestTask.status === 2 || latestTask.status === 3) {
          latestTaskStatus = latestTask.status;
          return;
        }

        // 呼叫資料集生成服務生成答案
        const result = await datasetService.generateDatasetForQuestion(task.projectId, question.id, {
          model: modelInfo,
          language: task.language
        });
        console.log(`Answer generated for question ${question.id}, dataset ID: ${result.dataset.id}`);

        // 增加成功計數
        successCount++;
        totalDatasets++;

        // 更新任務進度
        const progressNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, datasets generated: ${totalDatasets}`;
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: progressNote,
          note: progressNote
        });

        return { success: true, questionId: question.id, datasetId: result.dataset.id };
      } catch (error) {
        console.error(`Error processing question ${question.id}:`, error);
        errorCount++;
        const errorMessage = error?.message || String(error);
        errorList.push({ questionId: question.id, error: errorMessage });

        // 更新任務進度
        const progressNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, datasets generated: ${totalDatasets}`;
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: `${progressNote}, latest error: ${errorMessage}`,
          note: progressNote
        });

        return { success: false, questionId: question.id, error: errorMessage };
      }
    };

    // 並行處理所有問題，使用任務設定中的併發限制
    await processInParallel(questionsWithoutAnswers, processQuestion, concurrencyLimit, async (completed, total) => {
      console.log(`Answer generation progress: ${completed}/${total}`);
    });

    if (!latestTaskStatus) {
      // 任務完成，更新狀態
      const finalStatus = errorCount > 0 && successCount === 0 ? 2 : 1; // 如果全部失敗，標記為失敗；否則標記為完成
      const errorSummary = errorList
        .slice(0, 3)
        .map(item => `[${item.questionId}] ${item.error}`)
        .join(' | ');
      const finalNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, datasets generated: ${totalDatasets}${errorSummary ? `, errors: ${errorSummary}` : ''}`;
      await updateTask(task.id, {
        status: finalStatus,
        completedCount: successCount + errorCount,
        detail: errorList.length ? JSON.stringify({ errors: errorList.slice(0, 20) }) : '',
        note: finalNote,
        endTime: new Date()
      });
    }

    console.log(`Task completed: ${task.id}`);
  } catch (error) {
    console.error('Answer generation task error:', error);
    await updateTask(task.id, {
      status: 2, // 2 表示失敗
      detail: `Processing failed: ${error.message}`,
      note: `Processing failed: ${error.message}`,
      endTime: new Date()
    });
  }
}

export default {
  processAnswerGenerationTask
};
