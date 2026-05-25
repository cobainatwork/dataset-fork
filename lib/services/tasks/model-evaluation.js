/**
 * 模型評估任務處理服務
 * 呼叫評估服務層完成單題評估
 */

import { PrismaClient } from '@prisma/client';
import { TASK } from '@/constant';
import { updateTask } from './index';
import { getModelConfigByProjectId } from '@/lib/db/model-config';
import { evaluateSingleQuestion } from '@/lib/services/evaluation';

const prisma = new PrismaClient();

/**
 * 處理模型評估任務
 * @param {Object} task - 任務物件
 */
export async function processModelEvaluationTask(task) {
  const { id: taskId, projectId, detail, modelInfo, language } = task;

  try {
    console.log(`Model evaluation task started: ${taskId}, project: ${projectId}`);

    // 解析任務詳情和模型資訊
    const taskDetail = typeof detail === 'string' ? JSON.parse(detail) : detail;
    const modelInfoObj = typeof modelInfo === 'string' ? JSON.parse(modelInfo) : modelInfo;

    const { evalDatasetIds, judgeModelId, judgeProviderId, customScoreAnchors } = taskDetail;
    const { modelId, providerId } = modelInfoObj;

    console.log(
      `Using test model ${providerId}/${modelId}` +
        (judgeModelId && judgeProviderId ? `, judge model ${judgeProviderId}/${judgeModelId}` : '')
    );

    // 獲取模型配置
    const modelConfigs = await getModelConfigByProjectId(projectId);
    const testModelConfig = modelConfigs.find(c => c.modelId === modelId && c.providerId === providerId);

    if (!testModelConfig) {
      throw new Error(`Test model config not found: ${providerId}/${modelId}`);
    }

    // 獲取教師模型配置
    const judgeModelConfig =
      judgeModelId && judgeProviderId
        ? modelConfigs.find(c => c.modelId === judgeModelId && c.providerId === judgeProviderId)
        : null;

    // 獲取要評估的題目
    const evalDatasets = await prisma.evalDatasets.findMany({
      where: { id: { in: evalDatasetIds }, projectId }
    });

    if (evalDatasets.length === 0) {
      throw new Error('No eval datasets found for this task');
    }

    console.log(`Loaded ${evalDatasets.length} eval questions for task: ${taskId}`);

    await updateTask(taskId, { totalCount: evalDatasets.length });

    let completedCount = 0;
    let totalScore = 0;

    // 逐題評估
    for (const evalDataset of evalDatasets) {
      // 檢查任務是否被中斷
      const currentTask = await prisma.task.findUnique({ where: { id: taskId } });
      if (currentTask.status === TASK.STATUS.INTERRUPTED) {
        console.log(
          `Model evaluation task interrupted: ${taskId}, completed: ${completedCount}/${evalDatasets.length}`
        );
        return;
      }

      try {
        // 獲取該題型對應的自定義評分規則
        const scoreAnchorsForType = customScoreAnchors?.[evalDataset.questionType] || null;

        // 呼叫服務層進行單題評估
        const result = await evaluateSingleQuestion({
          evalDataset,
          testModelConfig,
          judgeModelConfig,
          projectId,
          language,
          customScoreAnchors: scoreAnchorsForType
        });

        // 儲存評估結果
        await saveEvalResult(projectId, taskId, evalDataset.id, result);
        totalScore += result.score;
      } catch (error) {
        console.error(`Failed to evaluate question: ${evalDataset.id}`, error);
        await saveEvalResult(projectId, taskId, evalDataset.id, {
          modelAnswer: '',
          score: 0,
          isCorrect: false,
          judgeResponse: `Evaluation failed: ${error.message}`,
          duration: 0,
          status: 2, // API_ERROR
          errorMessage: error.message || 'Unknown error'
        });
      }

      completedCount++;
      if (completedCount % 10 === 0 || completedCount === evalDatasets.length) {
        console.log(
          `Model evaluation progress: ${completedCount}/${evalDatasets.length} questions completed for task ${taskId}`
        );
      }
      await updateTask(taskId, { completedCount });
    }

    // 計算最終得分並完成任務
    const finalScore = evalDatasets.length > 0 ? (totalScore / evalDatasets.length) * 100 : 0;
    const updatedDetail = {
      ...taskDetail,
      finalScore: parseFloat(finalScore.toFixed(2)),
      totalQuestions: evalDatasets.length,
      totalScore: parseFloat(totalScore.toFixed(4))
    };

    await updateTask(taskId, {
      status: TASK.STATUS.COMPLETED,
      detail: JSON.stringify(updatedDetail)
    });

    console.log(`Model evaluation task completed: ${taskId}, score: ${finalScore.toFixed(2)}%`);
  } catch (error) {
    console.error(`Model evaluation task failed: ${taskId}`, error);
    await updateTask(taskId, {
      status: TASK.STATUS.FAILED,
      note: `Evaluation failed: ${error.message}`
    });
  }
}

/**
 * 儲存評估結果
 */
async function saveEvalResult(projectId, taskId, evalDatasetId, result) {
  const { modelAnswer, score, isCorrect, judgeResponse, duration = 0, status = 0, errorMessage = '' } = result;

  await prisma.evalResults.upsert({
    where: { taskId_evalDatasetId: { taskId, evalDatasetId } },
    update: {
      modelAnswer,
      score,
      isCorrect,
      judgeResponse,
      duration,
      status,
      errorMessage
    },
    create: {
      projectId,
      taskId,
      evalDatasetId,
      modelAnswer,
      score,
      isCorrect,
      judgeResponse,
      duration,
      status,
      errorMessage
    }
  });
}
