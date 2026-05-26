/**
 * 任務恢復服務
 * 用於在服務啟動時檢查並恢復未完成的任務
 */
import { PrismaClient } from '@prisma/client';
import { processTask } from './index';

const prisma = new PrismaClient();

/**
 * 恢復未完成的任務
 * 在應用啟動時自動執行一次。所有 task type 都委派給 processTask（同一份
 * 分派表），未來新增 task type 不需要在這裡同步維護 switch。
 */
export async function recoverPendingTasks() {
  if (process.env.INITED) return;
  process.env.INITED = true;

  try {
    console.log('Checking unfinished tasks...');

    const pendingTasks = await prisma.task.findMany({
      where: { status: 0 }
    });

    if (pendingTasks.length === 0) {
      console.log('No tasks to recover');
      return;
    }

    console.log(`Found ${pendingTasks.length} unfinished tasks, recovering...`);

    for (const task of pendingTasks) {
      processTask(task.id).catch(error => {
        console.error(`Failed to recover task ${task.id} (${task.taskType}):`, error);
      });
    }

    console.log('Task recovery started; unfinished tasks will continue in the background');
  } catch (error) {
    console.error('Task recovery error:', error);
  }
}

// 在模組載入時自動執行恢復
recoverPendingTasks().catch(error => {
  console.error('Failed to run task recovery:', error);
});
