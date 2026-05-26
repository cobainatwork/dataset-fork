import { processPrompt } from '../common/prompt-loader';
import { getQuestionTemplate } from '../common/question-template';

// 原始問題就是預設提示詞，templatePrompt、outputFormatPrompt 只有在定義問題模版時才會存在
export const IMAGE_ANSWER_PROMPT = `{{question}}{{templatePrompt}}{{outputFormatPrompt}}`;
export const IMAGE_ANSWER_PROMPT_EN = IMAGE_ANSWER_PROMPT;
export const IMAGE_ANSWER_PROMPT_TR = IMAGE_ANSWER_PROMPT;

/**
 * 生成影像答案提示詞
 * @param {string} language - 語言，'en' 或 'zh-TW'
 * @param {Object} params - 引數物件
 * @param {number} params.number - 問題數量
 * @param {string} projectId - 專案ID（用於自定義提示詞）
 * @returns {string} - 完整的提示詞
 */
export async function getImageAnswerPrompt(language, { question, questionTemplate }, projectId = null) {
  const { templatePrompt, outputFormatPrompt } = getQuestionTemplate(questionTemplate, language);
  const result = await processPrompt(
    language,
    'imageAnswer',
    'IMAGE_ANSWER_PROMPT',
    { zh: IMAGE_ANSWER_PROMPT, en: IMAGE_ANSWER_PROMPT_EN, tr: IMAGE_ANSWER_PROMPT_TR },
    {
      question,
      templatePrompt,
      outputFormatPrompt
    },
    projectId
  );
  return result;
}
