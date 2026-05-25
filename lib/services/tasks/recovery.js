/**
 * 任務恢復服務
 * 用於在服務啟動時檢查並恢復未完成的任務
 */
import { PrismaClient } from '@prisma/client';
import { processAnswerGenerationTask } from './answer-generation';
import { processQuestionGenerationTask } from './question-generation';

const prisma = new PrismaClient();

// 服務初始化標誌，確保只執行一次
let initialized = false;

/**
 * 恢復未完成的任務
 * 在應用啟動時自動執行一次
 */
export async function recoverPendingTasks() {
  // 如果已經初始化過，直接返回
  if (process.env.INITED) {
    return;
  }

  process.env.INITED = true;

  try {
    console.log('Checking unfinished tasks...');

    // 查詢所有處理中的任務
    const pendingTasks = await prisma.task.findMany({
      where: {
        status: 0 // 處理中的任務
      }
    });

    if (pendingTasks.length === 0) {
      console.log('No tasks to recover');
      initialized = true;
      return;
    }

    console.log(`Found ${pendingTasks.length} unfinished tasks, recovering...`);

    // 遍歷處理每個任務
    for (const task of pendingTasks) {
      try {
        // 根據任務型別呼叫對應的處理函式
        switch (task.taskType) {
          case 'question-generation':
            // 非同步處理，不等待完成
            processQuestionGenerationTask(task).catch(error => {
              console.error(`Failed to recover question generation task ${task.id}:`, error);
            });
            break;
          case 'answer-generation':
            // 非同步處理，不等待完成
            processAnswerGenerationTask(task).catch(error => {
              console.error(`Failed to recover answer generation task ${task.id}:`, error);
            });
            break;
          default:
            console.warn(`Other Task: ${task.taskType}`);
            await prisma.task.update({
              where: { id: task.id },
              data: {
                status: 2,
                detail: `${task.taskType} Error`,
                note: `${task.taskType} Error`,
                endTime: new Date()
              }
            });
        }
      } catch (error) {
        console.error(`Failed to recover task ${task.id}:`, error);
      }
    }

    console.log('Task recovery started; unfinished tasks will continue in the background');
    initialized = true;
  } catch (error) {
    console.error('Task recovery error:', error);
    // 即使出錯也標記為已初始化，避免反覆嘗試
    initialized = true;
  }
}

// 在模組載入時自動執行恢復
recoverPendingTasks().catch(error => {
  console.error('Failed to run task recovery:', error);
});
