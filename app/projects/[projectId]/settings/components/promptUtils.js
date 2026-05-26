/**
 * 提示詞設定相關工具函式
 */

/**
 * 從提示詞鍵名解析語言
 * @param {string} promptKey 提示詞鍵名
 * @returns {string} 語言程式碼 ('zh-TW' 或 'en')
 */
export const getLanguageFromPromptKey = promptKey => {
  if (promptKey?.endsWith('_EN')) return 'en';
  if (promptKey?.endsWith('_TR')) return 'tr';
  return 'zh-TW';
};

/**
 * 判斷是否應該顯示當前提示詞（基於語言）
 * @param {string} promptKey 提示詞鍵名
 * @param {string} currentLanguage 當前介面語言
 * @returns {boolean} 是否應該顯示
 */
export const shouldShowPrompt = (promptKey, currentLanguage) => {
  const promptLang = getLanguageFromPromptKey(promptKey);
  return promptLang === currentLanguage;
};

/**
 * 構建提示詞標題顯示元件
 * @param {Object} options 配置項
 * @param {string} options.name 提示詞名稱
 * @param {boolean} options.customized 是否已自定義
 * @returns {Object} 包含名稱和自定義標記的顯示配置
 */
export const buildPromptTitle = ({ name, customized }) => {
  return { name, customized };
};
