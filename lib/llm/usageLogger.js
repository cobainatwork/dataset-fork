/**
 * LLM 呼叫統計日誌工具
 * 非同步記錄 LLM 呼叫的 Token 消耗、響應時間等指標
 */
import { db } from '@/lib/db/index';

/**
 * 獲取當前日期字串 (YYYY-MM-DD)
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 非同步記錄 LLM 呼叫日誌（不阻塞主流程）
 * @param {Object} params - 日誌引數
 * @param {string} params.projectId - 專案 ID
 * @param {string} params.provider - 提供商名稱
 * @param {string} params.model - 模型名稱
 * @param {number} params.inputTokens - 輸入 Token 數
 * @param {number} params.outputTokens - 輸出 Token 數
 * @param {number} params.latency - 響應耗時（毫秒）
 * @param {string} params.status - 狀態 ('SUCCESS' | 'FAILED')
 * @param {string} [params.errorMessage] - 錯誤資訊（失敗時填寫）
 */
export async function logLlmUsage({
  projectId,
  provider,
  model,
  inputTokens = 0,
  outputTokens = 0,
  latency = 0,
  status = 'SUCCESS',
  errorMessage = null
}) {
  // 非同步執行，不阻塞主流程
  setImmediate(async () => {
    try {
      await db.llmUsageLogs.create({
        data: {
          projectId: projectId || 'unknown',
          provider: provider || 'unknown',
          model: model || 'unknown',
          inputTokens: inputTokens || 0,
          outputTokens: outputTokens || 0,
          totalTokens: (inputTokens || 0) + (outputTokens || 0),
          latency: latency || 0,
          status: status || 'SUCCESS',
          errorMessage: errorMessage || null,
          dateString: getDateString()
        }
      });
    } catch (error) {
      // 靜默失敗，不影響主流程
      console.error('[LLM Usage Logger] Failed to log usage:', error.message);
    }
  });
}

/**
 * 建立一個計時器，用於測量 LLM 呼叫耗時
 * @returns {Object} 計時器物件
 */
export function createLatencyTimer() {
  const startTime = Date.now();
  return {
    /**
     * 獲取從開始到現在的耗時（毫秒）
     */
    getLatency() {
      return Date.now() - startTime;
    }
  };
}

/**
 * 從 LLM 響應中提取 Token 使用資訊
 * @param {Object} response - LLM 響應物件
 * @returns {Object} Token 使用資訊
 */
export function extractTokenUsage(response) {
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    // AI SDK 格式
    if (response?.usage) {
      inputTokens = response.usage.promptTokens || response.usage.prompt_tokens || 0;
      outputTokens = response.usage.completionTokens || response.usage.completion_tokens || 0;
    }
    // OpenAI 原生格式
    else if (response?.response?.body?.usage) {
      const usage = response.response.body.usage;
      inputTokens = usage.prompt_tokens || 0;
      outputTokens = usage.completion_tokens || 0;
    }
    // 其他格式嘗試
    else if (response?.prompt_tokens !== undefined) {
      inputTokens = response.prompt_tokens || 0;
      outputTokens = response.completion_tokens || 0;
    }
  } catch (error) {
    console.error('[LLM Usage Logger] Failed to extract token usage:', error.message);
  }

  return { inputTokens, outputTokens };
}

/**
 * 包裝 LLM 呼叫，自動記錄統計資訊
 * @param {Function} llmCall - LLM 呼叫函式
 * @param {Object} context - 上下文資訊
 * @param {string} context.projectId - 專案 ID
 * @param {string} context.provider - 提供商名稱
 * @param {string} context.model - 模型名稱
 * @returns {Promise<any>} LLM 呼叫結果
 */
export async function withUsageLogging(llmCall, context) {
  const timer = createLatencyTimer();
  let response = null;
  let status = 'SUCCESS';
  let errorMessage = null;

  try {
    response = await llmCall();
    return response;
  } catch (error) {
    status = 'FAILED';
    errorMessage = error.message || String(error);
    throw error;
  } finally {
    const latency = timer.getLatency();
    const { inputTokens, outputTokens } = response ? extractTokenUsage(response) : { inputTokens: 0, outputTokens: 0 };

    logLlmUsage({
      projectId: context.projectId,
      provider: context.provider,
      model: context.model,
      inputTokens,
      outputTokens,
      latency,
      status,
      errorMessage
    });
  }
}

export default {
  logLlmUsage,
  createLatencyTimer,
  extractTokenUsage,
  withUsageLogging
};
