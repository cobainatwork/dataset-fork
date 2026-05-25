/**
 * 模型評估服務
 * 提供單題評估、答案匹配、LLM 評分等核心功能
 */

import LLMClient from '@/lib/llm/core/index';
import { buildAnswerPrompt } from '@/lib/llm/prompts/modelEvaluation';
import { buildJudgePrompt } from '@/lib/llm/prompts/llmJudge';

// 答題狀態常量
export const EVAL_STATUS = {
  SUCCESS: 0, // 成功
  FORMAT_ERROR: 1, // 輸出格式不符合規範
  API_ERROR: 2 // LLM 呼叫報錯
};

/**
 * 評估單個題目
 * @param {Object} params - 評估引數
 * @param {Object} params.evalDataset - 評估題目資料
 * @param {Object} params.testModelConfig - 測試模型配置
 * @param {Object} params.judgeModelConfig - 教師模型配置（可選，主觀題需要）
 * @param {string} params.projectId - 專案ID
 * @param {string} params.language - 語言
 * @param {Array} params.customScoreAnchors - 自定義評分規則（可選）
 * @returns {Promise<Object>} - 評估結果 { modelAnswer, score, isCorrect, judgeResponse, duration, status, errorMessage }
 */
export async function evaluateSingleQuestion({
  evalDataset,
  testModelConfig,
  judgeModelConfig,
  projectId,
  language = 'zh-CN',
  customScoreAnchors = null
}) {
  const startTime = Date.now();
  let modelAnswer = '';
  let status = EVAL_STATUS.SUCCESS;
  let errorMessage = '';

  // 建立測試模型客戶端
  const testLLMClient = new LLMClient({
    projectId,
    providerId: testModelConfig.providerId,
    modelName: testModelConfig.modelId,
    apiKey: testModelConfig.apiKey,
    endpoint: testModelConfig.endpoint
  });

  try {
    // 獲取模型回答
    modelAnswer = await getModelAnswer(testLLMClient, evalDataset, language, projectId);
  } catch (error) {
    // LLM 呼叫報錯
    status = EVAL_STATUS.API_ERROR;
    errorMessage = error.message || 'LLM API Error';
    const duration = Date.now() - startTime;

    return {
      modelAnswer: '',
      score: 0,
      isCorrect: false,
      judgeResponse: '',
      duration,
      status,
      errorMessage
    };
  }

  // 評估答案
  let judgeClient = null;
  if (judgeModelConfig && needsLLMJudge(evalDataset.questionType)) {
    judgeClient = new LLMClient({
      projectId,
      providerId: judgeModelConfig.providerId,
      modelName: judgeModelConfig.modelId,
      apiKey: judgeModelConfig.apiKey,
      endpoint: judgeModelConfig.endpoint
    });
  }

  const result = await evaluateAnswer(evalDataset, modelAnswer, judgeClient, language, customScoreAnchors, projectId);

  // 檢查是否是格式錯誤（對於客觀題，如果無法匹配答案可能是格式問題）
  if (!result.isCorrect && isFormatError(evalDataset.questionType, modelAnswer)) {
    status = EVAL_STATUS.FORMAT_ERROR;
    errorMessage = '模型輸出格式不符合規範';
  }

  const duration = Date.now() - startTime;

  return {
    modelAnswer,
    ...result,
    duration,
    status,
    errorMessage
  };
}

/**
 * 檢查是否是格式錯誤
 */
function isFormatError(questionType, modelAnswer) {
  if (!modelAnswer || modelAnswer.trim() === '') return true;

  const answer = modelAnswer.trim();

  switch (questionType) {
    case 'true_false':
      // 判斷題應該輸出 ✅ 或 ❌
      return answer !== '✅' && answer !== '❌';

    case 'single_choice':
      // 單選題應該輸出單個字母
      return !/^[A-Za-z]$/.test(answer.charAt(0));

    case 'multiple_choice':
      // 多選題應該輸出多個字母
      return !/^[A-Za-z]+$/.test(answer.replace(/[^A-Za-z]/g, ''));

    default:
      return false;
  }
}

/**
 * 檢查題型是否需要 LLM 評分
 */
export function needsLLMJudge(questionType) {
  return questionType === 'short_answer' || questionType === 'open_ended';
}

/**
 * 獲取模型對題目的回答
 */
async function getModelAnswer(llmClient, evalDataset, language, projectId = null) {
  const { question, questionType, options } = evalDataset;

  // 構建選項文字
  let optionsText = '';
  if (options && (questionType === 'single_choice' || questionType === 'multiple_choice')) {
    try {
      const optionsArray = JSON.parse(options);
      optionsText = optionsArray.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n');
    } catch (e) {
      optionsText = options;
    }
  }

  // 構建提示詞
  const prompt = await buildAnswerPrompt(questionType, question, optionsText, language, projectId);

  const { answer } = await llmClient.getResponseWithCOT(prompt);
  return answer;
}

/**
 * 評估模型答案
 */
async function evaluateAnswer(
  evalDataset,
  modelAnswer,
  judgeLLMClient,
  language,
  customScoreAnchors = null,
  projectId = null
) {
  const { questionType, correctAnswer } = evalDataset;

  switch (questionType) {
    case 'true_false':
      return evaluateTrueFalse(modelAnswer, correctAnswer);

    case 'single_choice':
      return evaluateSingleChoice(modelAnswer, correctAnswer);

    case 'multiple_choice':
      return evaluateMultipleChoice(modelAnswer, correctAnswer);

    case 'short_answer':
    case 'open_ended':
      if (!judgeLLMClient) {
        return {
          score: 0,
          isCorrect: false,
          judgeResponse: '缺少教師模型，無法評分'
        };
      }
      return await evaluateWithLLM(
        judgeLLMClient,
        evalDataset,
        modelAnswer,
        questionType,
        language,
        customScoreAnchors,
        projectId
      );

    default:
      return { score: 0, isCorrect: false, judgeResponse: '未知題型' };
  }
}

/**
 * 評估判斷題
 */
function evaluateTrueFalse(modelAnswer, correctAnswer) {
  // 根據 TRUE_FALSE_ANSWER_PROMPT，模型應該僅輸出 ✅ 或 ❌
  // 直接檢查這兩個 emoji
  const modelTrimmed = modelAnswer.trim();
  const correctTrimmed = correctAnswer.trim();

  console.log('modelTrimmed:', modelTrimmed);
  console.log('correctTrimmed:', correctTrimmed);

  const isCorrect = modelTrimmed === correctTrimmed && (modelTrimmed === '✅' || modelTrimmed === '❌');

  return {
    score: isCorrect ? 1 : 0,
    isCorrect,
    judgeResponse: ''
  };
}

/**
 * 評估單選題
 */
function evaluateSingleChoice(modelAnswer, correctAnswer) {
  const modelLetter = extractLetters(modelAnswer);
  const correctLetter = extractLetters(correctAnswer);

  const isCorrect = modelLetter.charAt(0) === correctLetter.charAt(0);

  return {
    score: isCorrect ? 1 : 0,
    isCorrect,
    judgeResponse: ''
  };
}

/**
 * 評估多選題
 */
function evaluateMultipleChoice(modelAnswer, correctAnswer) {
  const modelLetters = extractLetters(modelAnswer).split('').sort().join('');
  const correctLetters = extractLetters(correctAnswer).split('').sort().join('');

  const isCorrect = modelLetters === correctLetters;

  return {
    score: isCorrect ? 1 : 0,
    isCorrect,
    judgeResponse: ''
  };
}

/**
 * 使用 LLM 評估主觀題
 */
async function evaluateWithLLM(
  judgeLLMClient,
  evalDataset,
  modelAnswer,
  questionType,
  language,
  customScoreAnchors = null,
  projectId = null
) {
  const { question, correctAnswer } = evalDataset;

  // 構建評估提示詞（簡答題和開放題使用不同的評估標準，支援自定義評分規則）
  const prompt = await buildJudgePrompt(
    questionType,
    question,
    correctAnswer,
    modelAnswer,
    language,
    customScoreAnchors,
    projectId
  );

  try {
    const { answer } = await judgeLLMClient.getResponseWithCOT(prompt);
    return parseJudgeResponse(answer);
  } catch (error) {
    console.error('LLM 評分失敗:', error);
    return {
      score: 0,
      isCorrect: false,
      judgeResponse: `評分失敗: ${error.message}`
    };
  }
}

/**
 * 解析評分響應
 */
function parseJudgeResponse(responseText) {
  // 嘗試提取 JSON
  const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const score = Math.max(0, Math.min(1, parseFloat(parsed.score) || 0));
      return {
        score,
        isCorrect: score >= 0.6,
        judgeResponse: responseText
      };
    } catch (e) {
      // JSON 解析失敗，繼續嘗試其他方式
    }
  }

  // 嘗試從文字中提取分數
  const scoreMatch = responseText.match(/(\d+\.?\d*)/);
  if (scoreMatch) {
    let score = parseFloat(scoreMatch[1]);
    if (score > 1) score = score / 100;
    score = Math.max(0, Math.min(1, score));
    return {
      score,
      isCorrect: score >= 0.6,
      judgeResponse: responseText
    };
  }

  return {
    score: 0,
    isCorrect: false,
    judgeResponse: `無法解析評分結果: ${responseText}`
  };
}

/**
 * 標準化文字
 */
function normalizeText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * 提取字母（用於選擇題）
 */
function extractLetters(answer) {
  return String(answer || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

export default {
  evaluateSingleQuestion,
  needsLLMJudge
};
