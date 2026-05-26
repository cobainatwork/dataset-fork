import LLMClient from '@/lib/llm/core/index';
import { getEvalQuestionPrompt } from '@/lib/llm/prompts/evalQuestion';
import { extractJsonFromLLMOutput } from '@/lib/llm/common/util';
import { getChunkById } from '@/lib/db/chunks';
import { getTaskConfig } from '@/lib/db/projects';
import { createEvalQuestion } from '@/lib/db/evalDatasets';
import logger from '@/lib/util/logger';

/**
 * 計算各題型應該生成的數量
 * 使用加權隨機抽樣演算法，每次根據比例權重隨機選擇一個題型
 * @param {number} textLength - 文字長度
 * @param {number} questionGenerationLength - 每多少字生成一個問題（從配置中獲取）
 * @param {Object} ratios - 各題型比例配置
 * @returns {Object} - 各題型的生成數量
 */
function calculateQuestionCounts(textLength, questionGenerationLength, ratios) {
  // 計算總題目數
  const totalQuestions = Math.floor(textLength / questionGenerationLength);

  // 計算比例總和
  const totalRatio = Object.values(ratios).reduce((sum, ratio) => sum + ratio, 0);

  // 如果所有比例都是0或總題目數為0，返回空物件
  if (totalRatio === 0 || totalQuestions === 0) {
    return {};
  }

  const questionTypes = ['true_false', 'single_choice', 'multiple_choice', 'short_answer', 'open_ended'];

  // 過濾出比例大於0的題型
  const activeTypes = questionTypes.filter(type => ratios[type] > 0);

  if (activeTypes.length === 0) {
    return {};
  }

  // 初始化計數器
  const counts = {};
  activeTypes.forEach(type => {
    counts[type] = 0;
  });

  // 迴圈 totalQuestions 次，每次根據權重隨機選擇一個題型
  for (let i = 0; i < totalQuestions; i++) {
    // 生成 0 到 totalRatio 之間的隨機數
    const random = Math.random() * totalRatio;

    // 根據累積權重確定選中的題型
    let cumulative = 0;
    for (const type of activeTypes) {
      cumulative += ratios[type];
      if (random < cumulative) {
        counts[type]++;
        break;
      }
    }
  }

  // 過濾掉數量為0的題型
  const result = {};
  Object.keys(counts).forEach(type => {
    if (counts[type] > 0) {
      result[type] = counts[type];
    }
  });

  return result;
}

/**
 * 為單個文字塊生成測評題目
 * @param {string} projectId - 專案ID
 * @param {string} chunkId - 文字塊ID
 * @param {Object} options - 生成選項
 * @param {Object} options.model - 模型配置
 * @param {string} options.language - 語言（'zh-TW' 或 'en'）
 * @param {boolean} options.debug - 是否開啟除錯模式
 * @returns {Promise<Object>} - 生成結果
 */
export async function generateEvalQuestionsForChunk(projectId, chunkId, options) {
  const { model, language = 'zh-TW' } = options;

  try {
    // 獲取文字塊內容
    const chunk = await getChunkById(chunkId);
    if (!chunk) {
      throw new Error(`Chunk not found: ${chunkId}`);
    }

    // 獲取專案配置
    const taskConfig = await getTaskConfig(projectId);
    const { questionGenerationLength = 240, evalQuestionTypeRatios } = taskConfig;

    // 如果沒有配置比例，使用預設值
    const ratios = evalQuestionTypeRatios || {
      true_false: 0,
      single_choice: 1,
      multiple_choice: 0,
      short_answer: 0,
      open_ended: 0
    };

    // 計算各題型數量
    const questionCounts = calculateQuestionCounts(chunk.content.length, questionGenerationLength, ratios);

    logger.info('Generating eval questions:', questionCounts);

    // 如果沒有需要生成的題目，直接返回
    if (Object.keys(questionCounts).length === 0) {
      return {
        chunkId,
        questions: [],
        total: 0,
        message: 'No question types configured'
      };
    }

    // 建立LLM客戶端
    const llmClient = new LLMClient(model);

    // 為每個題型生成題目
    const allQuestions = [];
    const questionTypes = Object.keys(questionCounts);

    for (const questionType of questionTypes) {
      const count = questionCounts[questionType];
      if (count <= 0) continue;

      try {
        // 獲取對應題型的提示詞
        const prompt = await getEvalQuestionPrompt(
          language,
          questionType,
          {
            text: chunk.content,
            number: count
          },
          projectId
        );

        // 呼叫LLM生成題目
        const { answer } = await llmClient.getResponseWithCOT(prompt);

        // 使用專案標準的JSON解析函式
        const questions = extractJsonFromLLMOutput(answer);

        // 為每個題目新增型別標識
        questions.forEach(q => {
          q.questionType = questionType;
        });

        allQuestions.push(...questions);

        logger.info(`Generated ${questions.length} questions for type ${questionType}`);
      } catch (error) {
        logger.error(`Failed to generate questions for type ${questionType}:`, error);
        // 繼續處理其他題型
      }
    }

    // 儲存到資料庫（在服務層處理資料轉換）
    const savedQuestions = [];
    for (const question of allQuestions) {
      const saved = await createEvalQuestion({
        projectId,
        chunkId,
        question: question.question,
        questionType: question.questionType,
        options: question.options ? JSON.stringify(question.options) : '',
        correctAnswer: Array.isArray(question.correctAnswer)
          ? JSON.stringify(question.correctAnswer)
          : String(question.correctAnswer || ''),
        tags: question.tags || '',
        note: question.note || ''
      });
      savedQuestions.push(saved);
    }

    return {
      chunkId,
      questions: savedQuestions,
      total: savedQuestions.length,
      breakdown: questionCounts
    };
  } catch (error) {
    logger.error('Error generating eval questions:', error);
    throw error;
  }
}
