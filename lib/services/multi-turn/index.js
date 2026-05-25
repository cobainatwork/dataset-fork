/**
 * 多輪對話資料集生成核心服務
 */

import { getQuestionById } from '@/lib/db/questions';
import { getChunkById } from '@/lib/db/chunks';
import { createDatasetConversation } from '@/lib/db/dataset-conversations';
import LLMClient from '@/lib/llm/core/index';
import { getAssistantReplyPrompt, getNextQuestionPrompt } from '@/lib/llm/prompts/multiTurnConversation';
import { extractJsonFromLLMOutput } from '@/lib/llm/common/util';
import { nanoid } from 'nanoid';

/**
 * 生成多輪對話資料集
 * @param {string} projectId - 專案ID
 * @param {string} questionId - 問題ID
 * @param {object} config - 多輪對話配置
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function generateMultiTurnConversation(projectId, questionId, config) {
  try {
    const {
      systemPrompt = '',
      scenario = '',
      rounds = 3,
      roleA = '使用者',
      roleB = '助手',
      model,
      language = '中文'
    } = config;

    // 1. 獲取問題資訊
    const question = await getQuestionById(questionId);
    if (!question) {
      throw new Error('問題不存在');
    }

    if (question.projectId !== projectId) {
      throw new Error('問題不屬於指定專案');
    }

    // 2. 獲取文字塊內容
    const chunk = await getChunkById(question.chunkId);
    if (!chunk) {
      throw new Error('文字塊不存在');
    }

    // 3. 初始化對話訊息陣列
    const messages = [];

    // 新增系統提示詞（如果有）
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // 4. 建立LLM客戶端
    const llmClient = new LLMClient(model);

    // 5. 生成多輪對話
    let currentRound = 0;
    let userMessage = question.question; // 第一輪使用者問題

    while (currentRound < rounds) {
      // 新增使用者訊息
      messages.push({
        role: 'user',
        content: userMessage
      });

      // 生成助手回覆
      const conversationHistory = messages.slice(); // 複製當前對話歷史
      const assistantResponse = await generateAssistantResponse(
        llmClient,
        conversationHistory,
        chunk.content,
        scenario,
        roleA,
        roleB,
        currentRound + 1,
        rounds,
        projectId,
        language
      );

      // 新增助手訊息
      messages.push({
        role: 'assistant',
        content: assistantResponse
      });

      currentRound++;

      // 如果還需要更多輪對話，生成下一輪使用者問題
      if (currentRound < rounds) {
        const nextUserMessage = await generateNextUserMessage(
          llmClient,
          messages.slice(),
          chunk.content,
          scenario,
          roleA,
          roleB,
          currentRound + 1,
          rounds,
          projectId,
          language
        );
        userMessage = nextUserMessage;
      }
    }

    // 6. 儲存到資料庫
    const conversationData = {
      id: nanoid(),
      projectId,
      questionId,
      question: question.question,
      chunkId: question.chunkId,
      model: typeof model === 'string' ? model : model.modelName || 'unknown',
      questionLabel: question.label || '',
      scenario,
      roleA,
      roleB,
      turnCount: currentRound,
      maxTurns: rounds,
      rawMessages: JSON.stringify(messages),
      confirmed: false,
      score: 0,
      aiEvaluation: '',
      tags: '',
      note: `基於問題 "${question.question}" 生成的多輪對話`
    };

    const result = await createDatasetConversation(conversationData);

    return {
      success: true,
      data: result
    };
  } catch (error) {
    console.error('生成多輪對話失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 生成助手回覆
 */
async function generateAssistantResponse(
  llmClient,
  conversationHistory,
  chunkContent,
  scenario,
  roleA,
  roleB,
  currentRound,
  totalRounds,
  projectId,
  language
) {
  const prompt = await getAssistantReplyPrompt(
    language,
    {
      scenario,
      roleA,
      roleB,
      chunkContent,
      conversationHistory: formatConversationHistory(conversationHistory, roleA, roleB),
      currentRound,
      totalRounds
    },
    projectId
  );

  const response = await llmClient.getResponse(prompt);

  // 使用專案標準的JSON解析函式
  const assistantReply = extractJsonFromLLMOutput(response);

  if (assistantReply && assistantReply.content) {
    return assistantReply.content;
  } else {
    console.warn('助手回覆JSON解析失敗，使用原始響應:', response);
    return response.trim();
  }
}

/**
 * 生成下一輪使用者問題
 */
async function generateNextUserMessage(
  llmClient,
  conversationHistory,
  chunkContent,
  scenario,
  roleA,
  roleB,
  nextRound,
  totalRounds,
  projectId,
  language
) {
  const prompt = await getNextQuestionPrompt(
    language,
    {
      scenario,
      roleA,
      roleB,
      chunkContent,
      conversationHistory: formatConversationHistory(conversationHistory, roleA, roleB),
      nextRound,
      totalRounds
    },
    projectId
  );

  const response = await llmClient.getResponse(prompt);

  // 使用專案標準的JSON解析函式
  const nextQuestion = extractJsonFromLLMOutput(response);

  if (nextQuestion && nextQuestion.question) {
    return nextQuestion.question;
  } else {
    console.warn('下一輪問題JSON解析失敗，使用原始響應:', response);
    return response.trim();
  }
}

/**
 * 格式化對話歷史
 */
function formatConversationHistory(messages, roleA, roleB) {
  return messages
    .filter(msg => msg.role !== 'system')
    .map(msg => {
      const roleName = msg.role === 'user' ? roleA : roleB;
      return `${roleName}: ${msg.content}`;
    })
    .join('\n\n');
}

/**
 * 批次生成多輪對話資料集
 * @param {string} projectId - 專案ID
 * @param {Array} questionIds - 問題ID陣列
 * @param {object} config - 配置
 * @param {Function} progressCallback - 進度回撥
 * @returns {Promise<{success: number, failed: number, results: Array}>}
 */
export async function batchGenerateMultiTurnConversations(projectId, questionIds, config, progressCallback) {
  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (let i = 0; i < questionIds.length; i++) {
    const questionId = questionIds[i];

    try {
      const result = await generateMultiTurnConversation(projectId, questionId, config);

      if (result.success) {
        successCount++;
        results.push({
          questionId,
          success: true,
          data: result.data
        });
      } else {
        failedCount++;
        results.push({
          questionId,
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error(`生成多輪對話失敗 ${questionId}:`, error);
      failedCount++;
      results.push({
        questionId,
        success: false,
        error: error.message
      });
    }

    // 呼叫進度回撥
    if (progressCallback) {
      await progressCallback(i + 1, questionIds.length);
    }

    // 新增小延遲避免API限流
    if (i < questionIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    success: successCount,
    failed: failedCount,
    results
  };
}
