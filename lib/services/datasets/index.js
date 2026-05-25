import { getQuestionById, updateQuestion, getQuestionTemplateById } from '@/lib/db/questions';
import { createDataset, updateDataset } from '@/lib/db/datasets';
import { getAnswerPrompt } from '@/lib/llm/prompts/answer';
import { getEnhancedAnswerPrompt } from '@/lib/llm/prompts/enhancedAnswer';
import { getOptimizeCotPrompt } from '@/lib/llm/prompts/optimizeCot';
import { getSynthesizeCotPrompt } from '@/lib/llm/prompts/synthesizeCot';
import { safeParseJSON } from '@/lib/llm/common/util';
import { getChunkById } from '@/lib/db/chunks';
import { getActiveGaPairsByFileId } from '@/lib/db/ga-pairs';
import { nanoid } from 'nanoid';
import LLMClient from '@/lib/llm/core/index';
import logger from '@/lib/util/logger';

/**
 * 最佳化思維鏈
 * @param {string} originalQuestion - 原始問題
 * @param {string} answer - 答案
 * @param {string} originalCot - 原始思維鏈
 * @param {string} language - 語言
 * @param {object} llmClient - LLM客戶端
 * @param {string} id - 資料集ID
 * @param {string} projectId - 專案ID
 */
async function optimizeCot(originalQuestion, answer, originalCot, language, llmClient, id, projectId) {
  try {
    const prompt = await getOptimizeCotPrompt(language, { originalQuestion, answer, originalCot }, projectId);
    const { answer: as, cot } = await llmClient.getResponseWithCOT(prompt);
    const optimizedAnswer = as || cot;
    const result = await updateDataset({ id, cot: optimizedAnswer.replace('最佳化後的思維鏈', '') });
    logger.info(`成功最佳化思維鏈: ${originalQuestion}, ID: ${id}`);
    return result;
  } catch (error) {
    logger.error(`最佳化思維鏈失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 合成思維鏈（當模型未返回思維鏈時，根據問題、文字塊和答案手動合成）
 * @param {string} question - 問題
 * @param {string} text - 參考文字塊內容
 * @param {string} answer - 答案
 * @param {string} language - 語言
 * @param {object} llmClient - LLM客戶端
 * @param {string} projectId - 專案ID
 * @returns {Promise<string>} 合成的思維鏈
 */
async function synthesizeCot(question, text, answer, language, llmClient, projectId) {
  try {
    const prompt = await getSynthesizeCotPrompt(language, { question, text, answer }, projectId);
    const synthesizedCot = await llmClient.getResponse(prompt);
    logger.info(`成功合成思維鏈: ${question}`);
    return synthesizedCot;
  } catch (error) {
    logger.error(`合成思維鏈失敗: ${error.message}`);
    return '';
  }
}

/**
 * 為單個問題生成答案並建立資料集
 * @param {string} projectId - 專案ID
 * @param {string} questionId - 問題ID
 * @param {object} options - 選項
 * @param {string} options.model - 模型名稱
 * @param {string} options.language - 語言(中文/en)
 * @returns {Promise<Object>} 生成的資料集
 */
export async function generateDatasetForQuestion(projectId, questionId, options) {
  try {
    const { model, language = '中文' } = options;

    // 驗證引數
    if (!projectId || !questionId || !model) {
      throw new Error('缺少必要引數');
    }

    // 獲取問題
    const question = await getQuestionById(questionId);
    const questionTemplate = (await getQuestionTemplateById(question.id)) || { answerType: 'text' };
    if (!question) {
      throw new Error('問題不存在');
    }

    // 獲取文字塊內容
    const chunk = await getChunkById(question.chunkId);
    if (!chunk) {
      throw new Error('文字塊不存在');
    }
    const idDistill = ['Distilled Content', 'Image Chunk'].includes(chunk.name);

    const llmClient = new LLMClient(model);
    let activeGaPairs = [];
    let questionLinkedGaPair = null;
    let useEnhancedPrompt = false;

    if (chunk.fileId && !idDistill) {
      try {
        activeGaPairs = await getActiveGaPairsByFileId(chunk.fileId);
        if (question.gaPairId) {
          questionLinkedGaPair = activeGaPairs.find(ga => ga.id === question.gaPairId);
          if (questionLinkedGaPair) {
            useEnhancedPrompt = true;
            logger.info(`問題關聯GA pair: ${questionLinkedGaPair.genreTitle}+${questionLinkedGaPair.audienceTitle}`);
          }
        }

        logger.info(`${useEnhancedPrompt ? '使用' : '不使用'}增強提示詞`);
      } catch (error) {
        logger.warn(`獲取GA pairs失敗，使用標準提示詞: ${error.message}`);
        useEnhancedPrompt = false;
      }
    }

    let prompt;

    if (idDistill) {
      // 對於蒸餾內容，直接使用問題
      prompt = question.question;
    } else if (useEnhancedPrompt) {
      // 使用MGA增強提示詞
      const primaryGaPair = {
        genre: `${questionLinkedGaPair.genreTitle}: ${questionLinkedGaPair.genreDesc}`,
        audience: `${questionLinkedGaPair.audienceTitle}: ${questionLinkedGaPair.audienceDesc}`,
        active: questionLinkedGaPair.isActive
      };
      logger.info(`使用問題關聯的GA pair: ${primaryGaPair.genre} | ${primaryGaPair.audience}`);
      prompt = await getEnhancedAnswerPrompt(
        language,
        {
          text: chunk.content,
          question: question.question,
          activeGaPair: primaryGaPair,
          questionTemplate
        },
        projectId
      );

      logger.info(`使用MGA增強提示詞生成答案`);
    } else {
      // 使用標準提示詞
      prompt = await getAnswerPrompt(
        language,
        {
          text: chunk.content,
          question: question.question,
          questionTemplate
        },
        projectId
      );

      logger.info('使用標準提示詞生成答案');
    }

    // 呼叫大模型生成答案
    let { answer, cot } = await llmClient.getResponseWithCOT(prompt);
    if (questionTemplate.answerType !== 'text') {
      const answerJson = safeParseJSON(answer);
      if (typeof answerJson !== 'string') {
        answer = JSON.stringify(answerJson, null, 2);
      }
    }
    // 當模型未返回思維鏈時，手動合成思維鏈（蒸餾內容除外）
    let cotSynthesized = false;
    if (!cot && !idDistill) {
      logger.info(`模型未返回思維鏈，嘗試手動合成: ${question.question}`);
      cot = await synthesizeCot(question.question, chunk.content, answer, language, llmClient, projectId);
      cotSynthesized = !!cot;
    }

    const datasetId = nanoid(12);
    const datasets = {
      id: datasetId,
      projectId: projectId,
      question: question.question,
      answer: answer,
      model: model.modelName,
      cot: cot,
      questionLabel: question.label || '',
      answerType: questionTemplate.answerType || 'text'
    };

    let chunkData = await getChunkById(question.chunkId);
    datasets.chunkName = chunkData.name;
    datasets.chunkContent = ''; // 不再儲存原始文字塊內容
    datasets.questionId = question.id;

    let dataset = await createDataset(datasets);
    if (cot && !idDistill && !cotSynthesized) {
      // 為了效能考慮，這裡非同步最佳化（手動合成的思維鏈不需要最佳化）
      optimizeCot(question.question, answer, cot, language, llmClient, datasetId, projectId);
    }
    if (dataset) {
      await updateQuestion({ id: questionId, answered: true });
    }

    const logMessage = useEnhancedPrompt
      ? `成功生成MGA增強資料集: ${question.question}`
      : `成功生成標準資料集: ${question.question}`;
    logger.info(logMessage);

    return {
      success: true,
      dataset,
      mgaEnhanced: useEnhancedPrompt,
      activePairs: activeGaPairs.length
    };
  } catch (error) {
    logger.error(`生成資料集失敗: ${error.message}`);
    throw error;
  }
}

export default {
  generateDatasetForQuestion,
  optimizeCot
};
