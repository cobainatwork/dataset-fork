import { createOllama } from 'ollama-ai-provider';
import BaseClient from './base.js';

class OllamaClient extends BaseClient {
  constructor(config) {
    super(config);
    this.ollama = createOllama({
      baseURL: this.endpoint,
      apiKey: this.apiKey
    });
  }

  _getModel() {
    return this.ollama(this.model);
  }

  /**
   * 獲取本地可用的模型列表
   * @returns {Promise<Array>} 返回模型列表
   */
  async getModels() {
    try {
      const response = await fetch(this.endpoint + '/tags');
      const data = await response.json();
      // 處理響應，提取模型名稱
      if (data && data.models) {
        return data.models.map(model => ({
          name: model.name,
          modified_at: model.modified_at,
          size: model.size
        }));
      }
      return [];
    } catch (error) {
      console.error('Fetch error:', error);
    }
  }

  async chatStreamAPI(messages, options) {
    const model = this._getModel();
    const modelName = model?.modelId || model?.modelName || this.model;

    // 構建符合 Ollama API 的請求資料
    const payload = {
      model: modelName,
      messages: this._convertJson(messages),
      stream: true, // 開啟流式輸出
      options: {
        temperature: options.temperature || this.modelConfig.temperature,
        top_p: options.top_p || this.modelConfig.top_p,
        num_predict: options.max_tokens || this.modelConfig.max_tokens
      }
    };

    if (String(this.endpoint).endsWith('/api')) {
      this.endpoint = this.endpoint.slice(0, -4);
    }

    try {
      // 發起流式請求
      const response = await fetch(
        `${String(this.endpoint).endsWith('/') ? this.endpoint : `${this.endpoint}/`}api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API請求失敗: ${response.status} ${response.statusText}\n${errorText}`);
      }

      if (!response.body) {
        throw new Error('響應中沒有可讀取的資料流');
      }

      // 處理原始資料流，實現思維鏈的流式輸出
      const reader = response.body.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      // 建立一個新的可讀流
      const newStream = new ReadableStream({
        async start(controller) {
          let buffer = '';
          let isThinking = false; // 當前是否在輸出思維鏈模式
          let pendingReasoning = null; // 等待輸出的思維鏈

          // 輸出文字內容
          const sendContent = text => {
            if (!text) return;

            // 如果正在輸出思維鏈，需要先關閉思維鏈標籤
            if (isThinking) {
              controller.enqueue(encoder.encode('</think>'));
              isThinking = false;
            }

            controller.enqueue(encoder.encode(text));
          };

          // 流式輸出思維鏈
          const sendReasoning = text => {
            if (!text) return;

            // 如果還沒有開始思維鏈輸出，需要先新增思維鏈標籤
            if (!isThinking) {
              controller.enqueue(encoder.encode('<think>'));
              isThinking = true;
            }

            controller.enqueue(encoder.encode(text));
          };

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                // 流結束時，如果還在思維鏈模式，關閉標籤
                if (isThinking) {
                  controller.enqueue(encoder.encode('</think>'));
                }
                controller.close();
                break;
              }

              // 解析資料塊
              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              // 處理資料行
              let boundary = buffer.indexOf('\n');
              while (boundary !== -1) {
                const line = buffer.substring(0, boundary).trim();
                buffer = buffer.substring(boundary + 1);

                if (line) {
                  try {
                    // 解析JSON資料
                    const jsonData = JSON.parse(line);
                    const deltaContent = jsonData.message?.content;
                    const deltaReasoning = jsonData.message?.thinking;

                    // 如果有思維鏈內容，則即時流式輸出
                    if (deltaReasoning) {
                      sendReasoning(deltaReasoning);
                    }

                    // 如果有正文內容也即時輸出
                    if (deltaContent !== undefined && deltaContent !== null) {
                      sendContent(deltaContent);
                    }
                  } catch (e) {
                    // 忽略 JSON 解析錯誤
                    console.error('解析響應資料出錯:', e);
                  }
                }

                boundary = buffer.indexOf('\n');
              }
            }
          } catch (error) {
            console.error('處理資料流時出錯:', error);
            // 如果出錯時正在輸出思維鏈，要關閉思維鏈標籤
            if (isThinking) {
              try {
                controller.enqueue(encoder.encode('</think>'));
              } catch (e) {
                console.error('關閉思維鏈標籤出錯:', e);
              }
            }
            controller.error(error);
          }
        }
      });

      // 最終返回響應流
      return new Response(newStream, {
        headers: {
          'Content-Type': 'text/plain', // 純文字格式
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        }
      });
    } catch (error) {
      console.error('流式API調用出錯:', error);
      throw error;
    }
  }
}

module.exports = OllamaClient;
