/**
 * 領域樹處理模組
 * 用於處理領域樹的生成、修訂和管理
 */
import LLMClient from '../llm/core/index';
import { getProjectTocs } from '../file/text-splitter';
import { getTags, batchSaveTags } from '../db/tags';
import { extractJsonFromLLMOutput } from '../llm/common/util';
import { filterDomainTree } from './file';
import { getLabelPrompt } from '../llm/prompts/label';
import { getLabelRevisePrompt } from '../llm/prompts/labelRevise';

/**
 * 處理領域樹生成或更新
 * @param {Object} options - 配置選項
 * @param {string} options.projectId - 專案ID
 * @param {string} options.action - 操作型別: 'rebuild', 'revise', 'keep'
 * @param {string} options.toc - 所有文件的目錄結構
 * @param {Object} options.model - 使用的模型資訊
 * @param {string} options.language - 語言: 'en' 或 '中文'
 * @param {string} options.fileName - 檔名（用於新增檔案時獲取內容）
 * @param {string} options.deletedContent - 被刪除的檔案內容（用於刪除檔案時）
 * @param {Object} options.project - 專案資訊，包含 globalPrompt 和 domainTreePrompt
 * @returns {Promise<Array>} 生成的領域樹標籤
 */
export async function handleDomainTree({
  projectId,
  action = 'rebuild',
  allToc,
  newToc,
  model,
  language = '中文',
  deleteToc = null,
  project
}) {
  // 如果是保持不變，直接返回現有標籤
  if (action === 'keep') {
    console.log(`[${projectId}] Using existing domain tree`);
    return await getTags(projectId);
  }

  try {
    if (!allToc) {
      allToc = await getProjectTocs(projectId);
    }

    const llmClient = new LLMClient(model);
    let tags, prompt, response;
    // 重建領域樹
    if (action === 'rebuild') {
      console.log(`[${projectId}] Rebuilding domain tree`);
      prompt = await getLabelPrompt(language, { text: allToc.slice(0, 100000) }, projectId);
      response = await llmClient.getResponse(prompt);
      tags = extractJsonFromLLMOutput(response);
      console.log('rebuild tags', tags);
    }
    // 修訂領域樹
    else if (action === 'revise') {
      console.log(`[${projectId}] Revising domain tree`);
      // 獲取現有的領域樹
      const existingTags = await getTags(projectId);

      if (!existingTags || existingTags.length === 0) {
        // 如果沒有現有領域樹，就像重建一樣處理
        prompt = await getLabelPrompt(language, { text: allToc.slice(0, 100000) }, projectId);
      } else {
        // 增量更新領域樹的邏輯

        prompt = await getLabelRevisePrompt(
          language,
          {
            text: allToc,
            existingTags: filterDomainTree(existingTags),
            newContent: newToc,
            deletedContent: deleteToc
          },
          projectId
        );
      }

      // console.log('revise', prompt);

      response = await llmClient.getResponse(prompt);
      tags = extractJsonFromLLMOutput(response);

      // console.log('revise tags', tags);
    }

    // 儲存領域樹標籤（如果生成成功）
    if (tags && tags.length > 0 && action !== 'keep') {
      await batchSaveTags(projectId, tags);
    } else if (!tags && action !== 'keep') {
      console.error(`[${projectId}] Failed to generate domain tree tags`);
    }

    return tags;
  } catch (error) {
    console.error(`[${projectId}] Error handling domain tree: ${error.message}`);
    throw error;
  }
}
