'use server';
import { db } from '@/lib/db/index';

// 建一筆 cluster-maintenance task 並即時派發（fire-and-forget），收斂被刪 question 後的 cluster。
export async function enqueueClusterMaintenance(projectId) {
  try {
    const created = await db.task.create({
      data: {
        taskType: 'cluster-maintenance',
        projectId: projectId || null,
        detail: '{}',
        status: 0,
        modelInfo: '{}',
      },
    });
    const { processTask } = await import('@/lib/services/tasks');
    processTask(created.id).catch(e =>
      console.error(`[enqueueClusterMaintenance] dispatch failed task=${created.id}`, e)
    );
  } catch (e) {
    console.error(`[enqueueClusterMaintenance] failed projectId=${projectId}`, e);
  }
}
