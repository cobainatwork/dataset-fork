import LLMClient from '@/lib/llm/core/index';
import { getDataCleanPrompt } from '@/lib/llm/prompts/dataClean';
import { getTaskConfig, getProject } from '@/lib/db/projects';
import { getChunkById, updateChunkContent } from '@/lib/db/chunks';
import logger from '@/lib/util/logger';

/**
 * 為指定文字塊進行資料清洗
 * @param {String} projectId 專案ID
 * @param {String} chunkId 文字塊ID
 * @param {Object} options 選項
 * @param {String} options.model 模型名稱
 * @param {String} options.language 語言(中文/en)
 * @returns {Promise<Object>} 清洗結果
 */
export async function cleanDataForChunk(projectId, chunkId, options) {
  try {
    const { model, language = '中文' } = options;

    if (!model) {
      throw new Error('模型名稱不能為空');
    }

    // 並行獲取文字塊內容和專案配置
    const chunk = await getChunkById(chunkId);

    if (!chunk) {
      throw new Error('文字塊不存在');
    }

    // 建立LLM客戶端
    const llmClient = new LLMClient(model);

    // 獲取提示詞
    const prompt = await getDataCleanPrompt(language, { text: chunk.content }, projectId);

    const { answer: response } = await llmClient.getResponseWithCOT(prompt);

    // 直接使用LLM返回的清洗後文本
    const cleanedContent = response.trim();

    if (!cleanedContent) {
      throw new Error('資料清洗失敗：返回內容為空');
    }

    // 更新文字塊內容
    await updateChunkContent(chunkId, cleanedContent);

    // 返回清洗結果
    return {
      chunkId,
      originalLength: chunk.content.length,
      cleanedLength: cleanedContent.length,
      cleanedContent,
      success: true
    };
  } catch (error) {
    logger.error('資料清洗時出錯:', error);
    throw error;
  }
}

export default {
  cleanDataForChunk
};
