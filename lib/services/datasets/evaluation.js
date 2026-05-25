/**
 * 資料集評估核心服務
 * 從現有的評估介面中抽離核心邏輯，供單個評估和批次評估複用
 */

import { getDatasetsById, updateDatasetEvaluation } from '@/lib/db/datasets';
import { getChunkById } from '@/lib/db/chunks';
import LLMClient from '@/lib/llm/core/index';
import { getDatasetEvaluationPrompt } from '@/lib/llm/prompts/datasetEvaluation';
import { extractJsonFromLLMOutput } from '@/lib/llm/common/util';

/**
 * 評估單個數據集
 * @param {string} projectId - 專案ID
 * @param {string} datasetId - 資料集ID
 * @param {object} model - 模型配置
 * @param {string} language - 語言
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function evaluateDataset(projectId, datasetId, model, language = 'zh-CN') {
  try {
    // 1. 獲取資料集資訊
    const dataset = await getDatasetsById(datasetId);
    if (!dataset) {
      throw new Error('資料集不存在');
    }

    if (dataset.projectId !== projectId) {
      throw new Error('資料集不屬於指定專案');
    }

    // 2. 根據 questionId 獲取原始文字塊內容
    let chunkContent = dataset.chunkContent || '';

    // 如果資料集中沒有 chunkContent，嘗試透過 questionId 查詢
    if (!chunkContent && dataset.questionId) {
      try {
        // 查詢對應的問題，然後獲取 chunk 內容
        const { getQuestionById } = await import('@/lib/db/questions');
        const question = await getQuestionById(dataset.questionId);
        if (question && question.chunkId) {
          const chunk = await getChunkById(question.chunkId);
          if (chunk) {
            // 檢查是否是蒸餾內容
            if (chunk.name === 'Distilled Content') {
              chunkContent = 'Distilled Content - 沒有原始文字參考';
            } else {
              chunkContent = chunk.content;
            }
          }
        }
      } catch (error) {
        console.warn('無法獲取原始文字塊內容:', error.message);
        chunkContent = dataset.chunkContent || '';
      }
    }

    // 檢查是否是蒸餾內容
    if (dataset.chunkName === 'Distilled Content' || chunkContent.includes('Distilled Content')) {
      chunkContent = 'Distilled Content - 沒有原始文字參考';
    }

    // 3. 生成評估提示詞
    const prompt = await getDatasetEvaluationPrompt(
      language,
      {
        chunkContent,
        question: dataset.question,
        answer: dataset.answer
      },
      projectId
    );

    // 4. 呼叫LLM進行評估
    const llmClient = new LLMClient(model);
    const { answer } = await llmClient.getResponseWithCOT(prompt);

    // 5. 解析評估結果
    let evaluationResult;
    try {
      evaluationResult = extractJsonFromLLMOutput(answer);

      if (!evaluationResult || typeof evaluationResult.score !== 'number' || !evaluationResult.evaluation) {
        throw new Error('評估結果格式錯誤');
      }

      // 驗證評分範圍
      if (evaluationResult.score < 0 || evaluationResult.score > 5) {
        evaluationResult.score = Math.max(0, Math.min(5, evaluationResult.score));
      }

      // 確保評分精確到 0.5
      evaluationResult.score = Math.round(evaluationResult.score * 2) / 2;
    } catch (error) {
      console.error('解析評估結果失敗:', error);
      throw new Error('AI評估結果解析失敗，請重試');
    }

    // 6. 更新資料集評估結果
    await updateDatasetEvaluation(datasetId, evaluationResult.score, evaluationResult.evaluation);

    return {
      success: true,
      data: {
        score: evaluationResult.score,
        aiEvaluation: evaluationResult.evaluation
      }
    };
  } catch (error) {
    console.error('資料集評估失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 批次評估資料集
 * @param {string} projectId - 專案ID
 * @param {Array<string>} datasetIds - 資料集ID陣列
 * @param {object} model - 模型配置
 * @param {string} language - 語言
 * @param {Function} onProgress - 進度回撥函式 (current, total) => void
 * @returns {Promise<{success: number, failed: number, results: Array}>}
 */
export async function batchEvaluateDatasets(projectId, datasetIds, model, language = 'zh-CN', onProgress = null) {
  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < datasetIds.length; i++) {
    const datasetId = datasetIds[i];

    try {
      const result = await evaluateDataset(projectId, datasetId, model, language);

      if (result.success) {
        successCount++;
        results.push({
          datasetId,
          success: true,
          ...result.data
        });
      } else {
        failedCount++;
        results.push({
          datasetId,
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      failedCount++;
      results.push({
        datasetId,
        success: false,
        error: error.message
      });
    }

    // 呼叫進度回撥
    if (onProgress) {
      onProgress(i + 1, datasetIds.length);
    }

    // 新增小延遲避免過於頻繁的API呼叫
    if (i < datasetIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results
  };
}
