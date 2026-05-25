/**
 * LLM API 統一呼叫工具類
 * 支援多種模型提供商：OpenAI、Ollama、智譜AI等
 * 支援普通輸出和流式輸出
 */
import { DEFAULT_MODEL_SETTINGS } from '@/constant/model';
import { extractThinkChain, extractAnswer } from '@/lib/llm/common/util';
import { logLlmUsage, createLatencyTimer, extractTokenUsage } from '@/lib/llm/usageLogger';
const OllamaClient = require('./providers/ollama'); // 匯入 OllamaClient
const OpenAIClient = require('./providers/openai'); // 匯入 OpenAIClient
const ZhiPuClient = require('./providers/zhipu'); // 匯入 ZhiPuClient
const OpenRouterClient = require('./providers/openrouter');
const AlibailianClient = require('./providers/alibailian'); // 匯入 AlibailianClient
const MiniMaxClient = require('./providers/minimax'); // 匯入 MiniMaxClient

function normalizeLlmText(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map(item => normalizeLlmText(item))
      .filter(Boolean)
      .join('');
  }

  if (typeof value === 'object') {
    if (typeof value.text === 'string') {
      return value.text;
    }

    if (typeof value.content === 'string') {
      return value.content;
    }

    if (Array.isArray(value.content)) {
      return normalizeLlmText(value.content);
    }

    if (Array.isArray(value.parts)) {
      return normalizeLlmText(value.parts);
    }

    if (typeof value.reasoningText === 'string') {
      return value.reasoningText;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

class LLMClient {
  /**
   * 建立 LLM 客戶端例項
   * @param {Object} config - 配置資訊
   * @param {string} config.provider - 提供商名稱，如 'openai', 'ollama', 'zhipu' 等
   * @param {string} config.endpoint - API 端點，如 'https://api.openai.com/v1/'
   * @param {string} config.apiKey - API 金鑰（如果需要）
   * @param {string} config.model - 模型名稱，如 'gpt-3.5-turbo', 'llama2' 等
   * @param {number} config.temperature - 溫度引數
   * @param {string} [config.projectId] - 專案 ID（用於統計上報，可選）
   */
  constructor(config = {}) {
    // 儲存 projectId 用於統計上報
    this.projectId = config.projectId || null;
    this.config = {
      provider: config.providerId || 'openai',
      endpoint: this._handleEndpoint(config.providerId, config.endpoint) || '',
      apiKey: config.apiKey || '',
      model: config.modelId || config.modelName,
      temperature: config.temperature || DEFAULT_MODEL_SETTINGS.temperature,
      maxTokens: config.maxTokens || DEFAULT_MODEL_SETTINGS.maxTokens,
      max_tokens: config.maxTokens || DEFAULT_MODEL_SETTINGS.maxTokens,
      topP: config.topP !== undefined ? config.topP : DEFAULT_MODEL_SETTINGS.topP,
      top_p: config.topP !== undefined ? config.topP : DEFAULT_MODEL_SETTINGS.topP
    };
    if (config.topK !== undefined && config.topK !== 0) {
      this.config.topK = config.topK;
    }

    this.client = this._createClient(this.config.provider, this.config);
  }

  /**
   * 相容之前版本的使用者配置
   */
  _handleEndpoint(provider, endpoint) {
    const providerId = String(provider || '').toLowerCase();
    let normalizedEndpoint = String(endpoint || '').trim();

    if (!normalizedEndpoint) {
      return '';
    }

    // 相容誤配的智譜 coding endpoint（會導致 chat/completions 返回 404）
    if (providerId === 'ollama') {
      if (normalizedEndpoint.endsWith('v1/') || normalizedEndpoint.endsWith('v1')) {
        return normalizedEndpoint.replace(/v1\/?$/, 'api');
      }
    }
    if (normalizedEndpoint.includes('/chat/completions')) {
      return normalizedEndpoint.replace('/chat/completions', '');
    }
    return normalizedEndpoint;
  }

  _createClient(provider, config) {
    const clientMap = {
      ollama: OllamaClient,
      openai: OpenAIClient,
      siliconflow: OpenAIClient,
      deepseek: OpenAIClient,
      zhipu: ZhiPuClient,
      openrouter: OpenRouterClient,
      alibailian: AlibailianClient,
      minimax: MiniMaxClient
    };
    const providerId = String(provider || '').toLowerCase();
    // custom provider 且 endpoint 指向智譜時，優先使用 zhipu 客戶端
    if (providerId === 'custom' && String(config.endpoint || '').includes('open.bigmodel.cn')) {
      return new ZhiPuClient(config);
    }

    const ClientClass = clientMap[providerId] || OpenAIClient;
    return new ClientClass(config);
  }

  /**
   * 設定當前呼叫的專案 ID（用於統計上報）
   * @param {string} projectId - 專案 ID
   * @returns {LLMClient} 返回自身，支援鏈式呼叫
   */
  setProjectId(projectId) {
    this.projectId = projectId;
    return this;
  }

  async _callClientMethod(method, ...args) {
    const timer = createLatencyTimer();
    let response = null;
    let status = 'SUCCESS';
    let errorMessage = null;

    try {
      response = await this.client[method](...args);
      return response;
    } catch (error) {
      status = 'FAILED';
      errorMessage = error.message || String(error);
      console.error(`${this.config.provider} API 調用出錯:`, error);
      throw error;
    } finally {
      // 非同步上報統計資訊（不阻塞主流程）
      // 僅對非流式方法進行 Token 統計（流式方法無法直接獲取 Token 數）
      const isStreamMethod = method === 'chatStream' || method === 'chatStreamAPI';
      const { inputTokens, outputTokens } =
        !isStreamMethod && response ? extractTokenUsage(response) : { inputTokens: 0, outputTokens: 0 };

      logLlmUsage({
        projectId: this.projectId || 'unknown',
        provider: this.config.provider,
        model: this.config.model,
        inputTokens,
        outputTokens,
        latency: timer.getLatency(),
        status,
        errorMessage
      });
    }
  }

  /**
   * 生成對話響應
   * @param {string|Array} prompt - 使用者輸入的提示詞或對話歷史
   * @param {Object} options - 可選引數
   * @returns {Promise<Object>} 返回模型響應
   */
  async chat(prompt, options = {}) {
    const messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
    options = {
      ...options,
      ...this.config
    };
    return this._callClientMethod('chat', messages, options);
  }

  /**
   * 流式生成對話響應
   * @param {string|Array} prompt - 使用者輸入的提示詞或對話歷史
   * @param {Object} options - 可選引數
   * @returns {ReadableStream} 返回可讀流
   */
  /**
   * 純API流式生成對話響應
   * @param {string|Array} prompt - 使用者輸入的提示詞或對話歷史
   * @param {Object} options - 可選引數
   * @returns {Response} 返回原生Response物件
   */
  async chatStreamAPI(prompt, options = {}) {
    const messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
    options = {
      ...options,
      ...this.config
    };
    return this._callClientMethod('chatStreamAPI', messages, options);
  }

  /**
   * 流式生成對話響應
   * @param {string|Array} prompt - 使用者輸入的提示詞或對話歷史
   * @param {Object} options - 可選引數
   * @returns {ReadableStream} 返回可讀流
   */
  async chatStream(prompt, options = {}) {
    const messages = Array.isArray(prompt) ? prompt : [{ role: 'user', content: prompt }];
    options = {
      ...options,
      ...this.config
    };
    return this._callClientMethod('chatStream', messages, options);
  }

  // 獲取模型響應
  async getResponse(prompt, options = {}) {
    const llmRes = await this.chat(prompt, options);
    return normalizeLlmText(llmRes.text || llmRes.response?.messages || '');
  }

  // 提取答案和思維鏈
  extractAnswerAndCOT(llmRes) {
    let answer = normalizeLlmText(llmRes?.text || '');
    let cot = normalizeLlmText(llmRes?.reasoning || '');
    if ((answer && answer.startsWith('<think>')) || answer.startsWith('<thinking>')) {
      cot = extractThinkChain(answer);
      answer = extractAnswer(answer);
    } else if (
      llmRes?.response?.body?.choices?.length > 0 &&
      llmRes.response.body.choices[0].message.reasoning_content
    ) {
      if (llmRes.response.body.choices[0].message.reasoning_content) {
        cot = normalizeLlmText(llmRes.response.body.choices[0].message.reasoning_content);
      }
      if (llmRes.response.body.choices[0].message.content) {
        answer = normalizeLlmText(llmRes.response.body.choices[0].message.content);
      }
    }
    if (answer.startsWith('\n\n')) {
      answer = answer.slice(2);
    }
    if (cot.endsWith('\n\n')) {
      cot = cot.slice(0, -2);
    }
    return { answer, cot };
  }

  async getResponseWithCOT(prompt, options = {}) {
    const llmRes = await this.chat(prompt, options);
    return this.extractAnswerAndCOT(llmRes);
  }

  /**
   * 視覺模型響應（處理圖片和文字）
   * @param {string} prompt - 提示詞/問題
   * @param {string} base64Image - base64 編碼的圖片資料
   * @param {string|Object} mimeTypeOrOptions - MIME 型別或可選引數物件
   * @param {Object} options - 可選引數（當第三個引數是 mimeType 時使用）
   * @returns {Promise<Object>} 返回模型響應
   */
  async getVisionResponse(prompt, base64Image, mimeType = 'image/jpeg') {
    // 構建包含圖片的訊息
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ];
    const llmRes = await this._callClientMethod('chat', messages, {});
    return this.extractAnswerAndCOT(llmRes);
  }
}

module.exports = LLMClient;
