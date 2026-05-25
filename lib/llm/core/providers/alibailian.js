import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import BaseClient from './base.js';

/**
 * 阿里百鍊 Provider
 * 使用 createOpenAICompatible 來支援 providerOptions
 * 參考: https://github.com/vercel/ai/issues/6037
 */
class AlibailianClient extends BaseClient {
  constructor(config) {
    super(config);
    // 使用 createOpenAICompatible，name 必須設定為 'qwen' 才能使 providerOptions.qwen 生效
    this.qwen = createOpenAICompatible({
      name: 'qwen',
      apiKey: this.apiKey,
      baseURL: this.endpoint
    });
  }

  _getModel() {
    return this.qwen(this.model);
  }

  /**
   * 重寫 chat 方法，直接呼叫阿里百鍊 API
   * 支援 enable_thinking 引數和視覺模型
   */
  async chat(messages, options = {}) {
    // 轉換訊息格式，保持標準 OpenAI 格式（支援視覺模型）
    const formattedMessages = this._formatMessagesForVision(messages);

    // 構建請求體
    const requestBody = {
      model: this.model,
      messages: formattedMessages,
      temperature: options.temperature || this.modelConfig.temperature,
      top_p: options.topP !== undefined ? options.topP : options.top_p || this.modelConfig.top_p,
      max_tokens: options.max_tokens || this.modelConfig.max_tokens,
      enable_thinking: options.enable_thinking !== undefined ? options.enable_thinking : false
    };

    try {
      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`阿里百鍊 API 呼叫失敗: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      // 轉換為 AI SDK 格式
      return {
        text: data.choices[0]?.message?.content || '',
        finishReason: data.choices[0]?.finish_reason || 'stop',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('阿里百鍊 API 呼叫錯誤:', error);
      throw error;
    }
  }

  /**
   * 重寫 _convertJson 方法，支援視覺模型
   * 覆蓋父類方法，保持標準 OpenAI 格式
   */
  _convertJson(messages) {
    return this._formatMessagesForVision(messages);
  }

  /**
   * 格式化訊息，支援視覺模型的圖片內容
   * 保持標準 OpenAI 格式，不使用 experimental_attachments
   */
  _formatMessagesForVision(messages) {
    return messages.map(msg => {
      // 非 user 角色直接返回
      if (msg.role !== 'user') {
        return {
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        };
      }

      // 處理 user 訊息
      // 如果 content 是字串，直接返回
      if (typeof msg.content === 'string') {
        return {
          role: 'user',
          content: msg.content
        };
      }

      // 如果 content 是陣列（包含文字和圖片），保持標準 OpenAI 格式
      if (Array.isArray(msg.content)) {
        const formattedContent = msg.content.map(item => {
          if (item.type === 'text') {
            return {
              type: 'text',
              text: item.text
            };
          } else if (item.type === 'image_url') {
            return {
              type: 'image_url',
              image_url: {
                url: item.image_url.url
              }
            };
          }
          return item;
        });

        return {
          role: 'user',
          content: formattedContent
        };
      }

      // 預設情況
      return msg;
    });
  }
}

module.exports = AlibailianClient;
