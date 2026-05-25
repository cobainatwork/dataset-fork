import { getCustomPrompt } from '@/lib/db/custom-prompts';

/**
 * 獲取提示詞內容，優先使用專案自定義的，否則使用預設的
 * @param {string} projectId 專案ID
 * @param {string} promptType 提示詞型別 (如: question, answer等)
 * @param {string} promptKey 提示詞鍵名 (如: QUESTION_PROMPT, QUESTION_PROMPT_EN等)
 * @param {string} language 語言 (zh-CN, en)
 * @param {string} defaultContent 預設提示詞內容
 * @returns {Promise<string>} 提示詞內容
 */
export async function getPromptContent(projectId, promptType, promptKey, language, defaultContent) {
  try {
    if (!projectId) {
      return defaultContent;
    }

    const customPrompt = await getCustomPrompt(projectId, promptType, promptKey, language);

    if (customPrompt && customPrompt.isActive && customPrompt.content) {
      return customPrompt.content;
    }

    return defaultContent;
  } catch (error) {
    console.error('獲取提示詞內容失敗:', error);
    return defaultContent;
  }
}

/**
 * 根據語言獲取對應的提示詞鍵名
 * @param {string} language 語言
 * @param {string} baseKey 基礎鍵名
 * @returns {string} 完整的提示詞鍵名
 */
export function getPromptKey(language, baseKey) {
  if (language === 'en') {
    return `${baseKey}_EN`;
  }
  if (language === 'tr') {
    return `${baseKey}_TR`;
  }
  return baseKey;
}

/**
 * 根據提示詞鍵名獲取對應的語言
 * @param {string} promptKey 提示詞鍵名
 * @returns {string} 語言
 */
export function getLanguageFromKey(promptKey) {
  if (promptKey.endsWith('_EN')) {
    return 'en';
  }
  if (promptKey.endsWith('_TR')) {
    return 'tr';
  }
  return 'zh-CN';
}

/**
 * 通用的提示詞處理函式，減少模板程式碼
 * @param {string} language - 語言標識
 * @param {string} promptType - 提示詞型別 (如: dataClean, label, optimizeCot等)
 * @param {string} baseKey - 基礎鍵名 (如: DATA_CLEAN_PROMPT)
 * @param {Object} defaultPrompts - 預設提示詞物件 {zh: 中文提示詞, en: 英文提示詞}
 * @param {Object} params - 引數替換物件
 * @param {string} projectId - 專案ID
 * @returns {Promise<string>} - 處理後的提示詞
 */
export async function processPrompt(language, promptType, baseKey, defaultPrompts, params = {}, projectId = null) {
  const promptKey = getPromptKey(language, baseKey);
  let defaultPrompt;
  if (language === 'en') {
    defaultPrompt = defaultPrompts.en;
  } else if (language === 'tr') {
    defaultPrompt = defaultPrompts.tr;
  } else {
    defaultPrompt = defaultPrompts.zh;
  }
  const langCode = getLanguageFromKey(promptKey);

  let prompt = defaultPrompt;

  if (projectId) {
    try {
      prompt = await getPromptContent(projectId, promptType, promptKey, langCode, defaultPrompt);
    } catch (error) {
      console.error('獲取自定義提示詞失敗，使用預設提示詞:', error);
      prompt = defaultPrompt;
    }
  }

  // 引數替換
  let result = prompt;
  for (const [key, value] of Object.entries(params)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}
