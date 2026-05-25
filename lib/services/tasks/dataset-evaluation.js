/**
 * 資料集評估任務處理器
 * 處理批次資料集品質評估的非同步任務
 */

import { PrismaClient } from '@prisma/client';
import { processInParallel } from '@/lib/util/async';
import { updateTask } from './index';
import { getDatasetsByPagination } from '@/lib/db/datasets';
import { evaluateDataset } from '@/lib/services/datasets/evaluation';
import { getTaskConfig } from '@/lib/db/projects';
import { TASK } from '@/constant';

const prisma = new PrismaClient();

/**
 * 處理資料集評估任務
 * @param {object} task - 任務物件
 */
export async function processDatasetEvaluationTask(task) {
  const { id: taskId, projectId, modelInfo, language } = task;

  try {
    console.log(`Starting dataset evaluation task: ${taskId}`);

    // 更新任務狀態為處理中
    await updateTask(taskId, {
      status: TASK.STATUS.PROCESSING,
      startTime: new Date().toISOString()
    });

    // 解析模型資訊
    const model = typeof modelInfo === 'string' ? JSON.parse(modelInfo) : modelInfo;

    if (!model || !model.modelName) {
      throw new Error('Model config is incomplete');
    }

    // 1. 查詢所有未評估的資料集（score為0或null的資料集）
    console.log(`Searching unevaluated datasets in project ${projectId}...`);

    const unevaluatedDatasets = [];
    let page = 1;
    const pageSize = 2000;
    let hasMore = true;

    while (hasMore) {
      const response = await getDatasetsByPagination(projectId, page, pageSize, {
        // 不傳遞任何篩選條件，獲取所有資料集
      });

      console.log(`Fetched page ${page}, total ${response.data?.length || 0} datasets`);

      if (response.data && response.data.length > 0) {
        // 在記憶體中篩選未評估的資料集
        const unscored = response.data.filter(
          dataset => !dataset.score || dataset.score === 0 || !dataset.aiEvaluation
        );
        unevaluatedDatasets.push(...unscored);

        page++;
        hasMore = response.data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`Found ${unevaluatedDatasets.length} unevaluated datasets`);

    if (unevaluatedDatasets.length === 0) {
      await updateTask(taskId, {
        status: TASK.STATUS.COMPLETED,
        endTime: new Date().toISOString(),
        completedCount: 0,
        totalCount: 0,
        note: 'No datasets require evaluation'
      });
      return;
    }

    // 獲取任務配置，包括併發限制
    const taskConfig = await getTaskConfig(projectId);
    const concurrencyLimit = taskConfig.concurrencyLimit || 5;

    // 更新任務總數
    const totalCount = unevaluatedDatasets.length;
    await updateTask(taskId, {
      totalCount,
      detail: `Datasets to evaluate: ${totalCount}`,
      note: ''
    });

    // 2. 批次處理每個資料集
    let successCount = 0;
    let errorCount = 0;
    let latestTaskStatus = 0;

    // 單個數據集處理函式
    const processDataset = async dataset => {
      try {
        // 如果任務已經被標記為失敗或已中斷，不再繼續處理
        const latestTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (latestTask.status === 2 || latestTask.status === 3) {
          latestTaskStatus = latestTask.status;
          return;
        }

        // 呼叫資料集評估服務
        const result = await evaluateDataset(projectId, dataset.id, model, language);

        if (result.success) {
          console.log(
            `Dataset ${dataset.id} evaluated. Score: ${result.data.score}, progress: ${successCount + errorCount}/${totalCount}`
          );
          successCount++;
        } else {
          console.error(`Failed to evaluate dataset ${dataset.id}:`, result.error);
          errorCount++;
        }

        // 更新任務進度
        const progressNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}`;
        await updateTask(taskId, {
          completedCount: successCount + errorCount,
          detail: progressNote,
          note: progressNote
        });

        return { success: result.success, datasetId: dataset.id, ...result };
      } catch (error) {
        console.error(`Error processing dataset ${dataset.id}:`, error);
        errorCount++;

        // 更新任務進度
        const progressNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}`;
        await updateTask(taskId, {
          completedCount: successCount + errorCount,
          detail: progressNote,
          note: progressNote
        });

        return { success: false, datasetId: dataset.id, error: error.message };
      }
    };

    // 並行處理所有資料集，使用任務設定中的併發限制
    await processInParallel(unevaluatedDatasets, processDataset, concurrencyLimit, async (completed, total) => {});

    const evaluationResults = {
      success: successCount,
      failed: errorCount,
      results: [] // 簡化結果儲存
    };

    // 3. 更新任務完成狀態
    if (!latestTaskStatus) {
      // 如果任務沒有被中斷，根據處理結果更新狀態
      const finalStatus = errorCount === 0 ? TASK.STATUS.COMPLETED : TASK.STATUS.FAILED;
      const endTime = new Date().toISOString();
      const note = `Evaluation completed: ${successCount} succeeded, ${errorCount} failed`;

      await updateTask(taskId, {
        status: finalStatus,
        endTime,
        completedCount: successCount + errorCount,
        note,
        detail: `Total: ${totalCount}, succeeded: ${successCount}, failed: ${errorCount}`
      });

      console.log(`Dataset evaluation task completed: ${taskId}, ${note}`);
    }
  } catch (error) {
    console.error(`Dataset evaluation task failed: ${taskId}`, error);

    // 更新任務為失敗狀態
    await updateTask(taskId, {
      status: TASK.STATUS.FAILED,
      endTime: new Date().toISOString(),
      note: `Evaluation failed: ${error.message}`
    });

    throw error;
  }
}
