import LLMClient from '@/lib/llm/core/index';
import { getQuestionPrompt } from '@/lib/llm/prompts/question';
import { getAddLabelPrompt } from '@/lib/llm/prompts/addLabel';
import { extractJsonFromLLMOutput } from '@/lib/llm/common/util';
import { getTaskConfig, getProject } from '@/lib/db/projects';
import { getTags } from '@/lib/db/tags';
import { getChunkById } from '@/lib/db/chunks';
import { saveQuestions, saveQuestionsWithGaPair } from '@/lib/db/questions';
import { getActiveGaPairsByFileId } from '@/lib/db/ga-pairs';
import logger from '@/lib/util/logger';

/**
 * 隨機移除問題中的問號
 * @param {Array} questions 問題列表
 * @param {Number} probability 移除機率(0-100)
 * @returns {Array} 處理後的問題列表
 */
function randomRemoveQuestionMark(questions, questionMaskRemovingProbability) {
  for (let i = 0; i < questions.length; i++) {
    // 去除問題結尾的空格
    let question = questions[i].trimEnd();

    if (Math.random() * 100 < questionMaskRemovingProbability && (question.endsWith('?') || question.endsWith('？'))) {
      question = question.slice(0, -1);
    }
    questions[i] = question;
  }
  return questions;
}

/**
 * 為指定文字塊生成問題
 * @param {String} projectId 專案ID
 * @param {String} chunkId 文字塊ID
 * @param {Object} options 選項
 * @param {String} options.model 模型名稱
 * @param {String} options.language 語言(中文/en)
 * @param {Number} options.number 問題數量(可選)
 * @returns {Promise<Object>} 生成結果
 */
export async function generateQuestionsForChunk(projectId, chunkId, options) {
  try {
    const { model, language = '中文', number } = options;

    if (!model) {
      throw new Error('模型名稱不能為空');
    }

    // 並行獲取文字塊內容和專案配置
    const [chunk, taskConfig, project] = await Promise.all([
      getChunkById(chunkId),
      getTaskConfig(projectId),
      getProject(projectId)
    ]);

    if (!chunk) {
      throw new Error('文字塊不存在');
    }

    // 獲取專案配置資訊
    const { questionGenerationLength, questionMaskRemovingProbability = 60 } = taskConfig;
    const { globalPrompt, questionPrompt } = project;
    // 建立LLM客戶端
    const llmClient = new LLMClient(model);
    // 生成問題的數量，如果未指定，則根據文字長度自動計算
    const questionNumber = number || Math.floor(chunk.content.length / questionGenerationLength);

    // 生成問題提示詞
    const prompt = await getQuestionPrompt(
      language,
      {
        text: chunk.content,
        number: questionNumber,
        activeGaPair: primaryGaPair
      },
      projectId
    );
    const response = await llmClient.getResponse(prompt);

    // 從LLM輸出中提取JSON格式的問題列表
    const originalQuestions = extractJsonFromLLMOutput(response);
    const questions = randomRemoveQuestionMark(originalQuestions, questionMaskRemovingProbability);
    if (!questions || !Array.isArray(questions)) {
      throw new Error('生成問題失敗');
    }

    const tags = await getTags(projectId);
    const simplifiedTags = extractLabels(tags);
    const labelPrompt = await getAddLabelPrompt(
      language,
      {
        label: JSON.stringify(simplifiedTags),
        question: JSON.stringify(questions)
      },
      projectId
    );

    const labelResponse = await llmClient.getResponse(labelPrompt);
    const labelQuestions = extractJsonFromLLMOutput(labelResponse);

    // 儲存問題到資料庫
    await saveQuestions(projectId, labelQuestions, chunkId);

    // 返回生成的問題
    return {
      chunkId,
      labelQuestions,
      total: labelQuestions.length
    };
  } catch (error) {
    logger.error('生成問題時出錯:', error);
    throw error;
  }
}

function extractLabels(data) {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(item => {
    const result = {
      label: item.label
    };

    if (Array.isArray(item.child) && item.child.length > 0) {
      result.child = extractLabels(item.child);
    }

    return result;
  });
}

/**
 * 為指定文字塊生成問題（支援GA增強）
 * @param {String} projectId 專案ID
 * @param {String} chunkId 文字塊ID
 * @param {Object} options 選項
 * @param {String} options.model 模型名稱
 * @param {String} options.language 語言(中文/en)
 * @param {Number} options.number 問題數量(可選)
 * @param {Boolean} options.enableGaExpansion 是否啟用GA擴充套件生成
 * @returns {Promise<Object>} 生成結果
 */
export async function generateQuestionsForChunkWithGA(projectId, chunkId, options) {
  try {
    const { model, language = '中文', number } = options;

    if (!model) {
      throw new Error('模型名稱不能為空');
    }

    // 並行獲取文字塊內容和專案配置
    const [chunk, taskConfig] = await Promise.all([getChunkById(chunkId), getTaskConfig(projectId)]);

    if (!chunk) {
      throw new Error('文字塊不存在');
    }

    // 獲取專案配置資訊
    const { questionGenerationLength, questionMaskRemovingProbability = 60 } = taskConfig;

    // 檢查是否有可用的GA pairs並且啟用GA擴充套件
    let activeGaPairs = [];
    let useGaExpansion = false;

    if (chunk.fileId) {
      try {
        activeGaPairs = await getActiveGaPairsByFileId(chunk.fileId);
        useGaExpansion = activeGaPairs.length > 0;
        logger.info(`檢查到 ${activeGaPairs.length} 個啟用的GA pairs，${useGaExpansion ? '啟用' : '不啟用'}GA擴充套件生成`);
      } catch (error) {
        logger.warn(`獲取GA pairs失敗，使用標準生成: ${error.message}`);
        useGaExpansion = false;
      }
    }

    // 建立LLM客戶端
    const llmClient = new LLMClient(model);

    // 計算基礎問題數量
    const baseQuestionNumber = number || Math.floor(chunk.content.length / questionGenerationLength);

    let allGeneratedQuestions = [];
    let totalExpectedQuestions = baseQuestionNumber;

    if (useGaExpansion) {
      // GA擴充套件模式：為每個GA pair生成基礎數量的問題
      totalExpectedQuestions = baseQuestionNumber * activeGaPairs.length;
      logger.info(
        `GA擴充套件模式：將生成${baseQuestionNumber} 基礎問題 × ${activeGaPairs.length} GA pairs = ${totalExpectedQuestions}個總問題`
      );

      // 為每個GA pair生成問題
      for (const gaPair of activeGaPairs) {
        const activeGaPair = {
          genre: `${gaPair.genreTitle}: ${gaPair.genreDesc}`,
          audience: `${gaPair.audienceTitle}: ${gaPair.audienceDesc}`,
          active: gaPair.isActive
        };

        // 生成問題提示詞
        const prompt = await getQuestionPrompt(
          language,
          {
            text: chunk.content,
            number: baseQuestionNumber,
            activeGaPair: activeGaPair
          },
          projectId
        );

        const response = await llmClient.getResponse(prompt);
        const originalQuestions = extractJsonFromLLMOutput(response);
        const questions = randomRemoveQuestionMark(originalQuestions, questionMaskRemovingProbability);

        if (!questions || !Array.isArray(questions)) {
          logger.warn(`GA pair ${gaPair.genreTitle}+${gaPair.audienceTitle} 生成問題失敗，跳過`);
          continue;
        }

        // 為這批問題新增標籤
        const tags = extractLabels(await getTags(projectId));
        const labelPrompt = await getAddLabelPrompt(
          language,
          {
            label: JSON.stringify(tags),
            question: JSON.stringify(questions)
          },
          projectId
        );
        const labelResponse = await llmClient.getResponse(labelPrompt);
        const labelQuestions = extractJsonFromLLMOutput(labelResponse);

        // 儲存問題到資料庫（關聯GA pair）
        await saveQuestionsWithGaPair(projectId, labelQuestions, chunkId, gaPair.id);

        allGeneratedQuestions.push(
          ...labelQuestions.map(q => ({
            ...q,
            gaPairId: gaPair.id,
            gaPairInfo: `${gaPair.genreTitle}+${gaPair.audienceTitle}`
          }))
        );

        logger.info(`GA pair ${gaPair.genreTitle}+${gaPair.audienceTitle} 生成了 ${labelQuestions.length} 個問題`);
      }
    } else {
      // 標準模式：使用原有邏輯
      logger.info(`標準模式：生成 ${baseQuestionNumber} 個問題`);

      const prompt = await getQuestionPrompt(
        language,
        {
          text: chunk.content,
          number: baseQuestionNumber
        },
        projectId
      );

      const response = await llmClient.getResponse(prompt);
      const originalQuestions = extractJsonFromLLMOutput(response);
      const questions = randomRemoveQuestionMark(originalQuestions, questionMaskRemovingProbability);

      if (!questions || !Array.isArray(questions)) {
        throw new Error('生成問題失敗');
      }

      // 新增標籤
      const tags = extractLabels(await getTags(projectId));
      const labelPrompt = await getAddLabelPrompt(
        language,
        {
          label: JSON.stringify(tags),
          question: JSON.stringify(questions)
        },
        projectId
      );
      const labelResponse = await llmClient.getResponse(labelPrompt);
      const labelQuestions = extractJsonFromLLMOutput(labelResponse);

      // 儲存問題到資料庫（不關聯GA pair）
      await saveQuestions(projectId, labelQuestions, chunkId);

      allGeneratedQuestions = labelQuestions;
    }

    // 返回生成的問題
    return {
      chunkId,
      questions: allGeneratedQuestions,
      total: allGeneratedQuestions.length,
      expectedTotal: totalExpectedQuestions,
      gaExpansionUsed: useGaExpansion,
      gaPairsCount: activeGaPairs.length
    };
  } catch (error) {
    logger.error('GA增強問題生成時出錯:', error);
    throw error;
  }
}

export default {
  generateQuestionsForChunk,
  generateQuestionsForChunkWithGA
};
