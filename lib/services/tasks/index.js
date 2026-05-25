/**
 * 任務服務層入口檔案
 * 根據任務型別分配處理函式
 */

import { PrismaClient } from '@prisma/client';
import { TASK } from '@/constant';
import { processQuestionGenerationTask } from './question-generation';
import { processFileProcessingTask } from './file-processing';
import { processAnswerGenerationTask } from './answer-generation';
import { processDataCleaningTask } from './data-cleaning';
import { processDatasetEvaluationTask } from './dataset-evaluation';
import { processMultiTurnGenerationTask } from './multi-turn-generation';
import { processDataDistillationTask } from './data-distillation';
import { processImageQuestionGenerationTask } from './image-question-generation';
import { processImageDatasetGenerationTask } from './image-dataset-generation';
import { processEvalGenerationTask } from './eval-generation';
import { processModelEvaluationTask } from './model-evaluation';
import { processEmbeddingIncrementalTask } from './embedding-incremental';
import './recovery';

const prisma = new PrismaClient();

/**
 * 處理非同步任務
 * @param {string} taskId - 任務ID
 * @returns {Promise<void>}
 */
export async function processTask(taskId) {
  try {
    // 獲取任務資訊
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      return;
    }

    // 如果任務已經完成或失敗，不再處理
    if (task.status === TASK.STATUS.COMPLETED || task.status === TASK.STATUS.FAILED) {
      console.log(`Task already finished; skipping: ${taskId}`);
      return;
    }

    // 根據任務型別呼叫相應的處理函式
    switch (task.taskType) {
      case 'question-generation':
        await processQuestionGenerationTask(task);
        break;
      case 'file-processing':
        await processFileProcessingTask(task);
        break;
      case 'answer-generation':
        await processAnswerGenerationTask(task);
        break;
      case 'data-cleaning':
        await processDataCleaningTask(task);
        break;
      case 'dataset-evaluation':
        await processDatasetEvaluationTask(task);
        break;
      case 'multi-turn-generation':
        await processMultiTurnGenerationTask(task);
        break;
      case 'data-distillation':
        await processDataDistillationTask(task);
        break;
      case 'image-question-generation':
        await processImageQuestionGenerationTask(task);
        break;
      case 'image-dataset-generation':
        await processImageDatasetGenerationTask(task);
        break;
      case 'eval-generation':
        await processEvalGenerationTask(task);
        break;
      case 'model-evaluation':
        await processModelEvaluationTask(task);
        break;
      case 'embedding-incremental':
        await processEmbeddingIncrementalTask(task);
        break;
      default:
        console.error(`Unknown task type: ${task.taskType}`);
        await updateTask(taskId, { status: TASK.STATUS.FAILED, note: `Unknown task type: ${task.taskType}` });
    }
  } catch (error) {
    console.error(`Failed to process task: ${taskId}`, String(error));
    await updateTask(taskId, { status: TASK.STATUS.FAILED, note: `Processing failed: ${error.message}` });
  }
}

/**
 * 更新任務狀態
 * @param {string} taskId - 任務ID
 * @param {object} data - 更新資料
 * @returns {Promise<object>} - 更新後的任務
 */
export async function updateTask(taskId, data) {
  try {
    // 如果更新狀態為完成或失敗，且未提供結束時間，則自動新增
    if ((data.status === TASK.STATUS.COMPLETED || data.status === TASK.STATUS.FAILED) && !data.endTime) {
      data.endTime = new Date();
    }

    // 更新任務
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data
    });

    return updatedTask;
  } catch (error) {
    console.error(`Failed to update task status: ${taskId}`, error);
    throw error;
  }
}

/**
 * 啟動任務處理器
 * 輪詢資料庫中的待處理任務並執行
 */
export async function startTaskProcessor() {
  try {
    console.log('Starting task processor...');

    // 查詢所有處理中的任務
    const pendingTasks = await prisma.task.findMany({
      where: { status: TASK.STATUS.PROCESSING }
    });

    if (pendingTasks.length > 0) {
      console.log(`Found ${pendingTasks.length} pending tasks`);

      // 處理所有待處理任務
      for (const task of pendingTasks) {
        console.log(`Processing task: ${task.id}`);
        processTask(task.id).catch(err => {
          console.error(`Task processing failed: ${task.id}`, err);
        });
      }
    } else {
      console.log('No pending tasks');
    }
  } catch (error) {
    console.error('Failed to start task processor', error);
  }
}
