import { generateText, streamText } from 'ai';

function isOfficialOpenAIEndpoint(endpoint = '') {
  const normalizedEndpoint = String(endpoint || '')
    .trim()
    .toLowerCase();

  if (!normalizedEndpoint) {
    return false;
  }

  try {
    const { hostname } = new URL(normalizedEndpoint);
    return hostname === 'api.openai.com' || hostname.endsWith('.openai.com');
  } catch {
    return normalizedEndpoint.includes('api.openai.com');
  }
}

function checkOpenAIModel(endpoint, model) {
  if (!isOfficialOpenAIEndpoint(endpoint)) {
    return false;
  }

  const normalizedModel = String(model || '');
  return ['gpt-5', 'gpt-4', 'o1'].find(m => normalizedModel.startsWith(m));
}

function resolveModelId(model, fallbackModel) {
  if (typeof model === 'function') {
    return String(model.modelId || model.modelName || fallbackModel || '');
  }

  if (model && typeof model === 'object') {
    return String(model.modelId || model.modelName || fallbackModel || '');
  }

  return String(fallbackModel || '');
}

class BaseClient {
  constructor(config) {
    this.endpoint = config.endpoint || '';
    this.apiKey = config.apiKey || '';
    this.model = config.model || '';
    this.provider = config.provider || '';
    this.modelConfig = {
      temperature: config.temperature || 0.7,
      top_p: config.top_p !== undefined ? config.top_p : config.topP !== undefined ? config.topP : 0.9,
      max_tokens: config.max_tokens || 8192
    };
  }

  /**
   * chat（普通輸出）
   */
  async chat(messages, options) {
    const model = this._getModel();
    const isOpenAIModel = checkOpenAIModel(this.endpoint, this.model);
    const maxTokens = options.max_tokens || this.modelConfig.max_tokens;
    const result = await generateText({
      model,
      messages: this._convertJson(messages),
      ...(isOpenAIModel
        ? { maxCompletionTokens: maxTokens, temperature: 1 }
        : {
            maxTokens,
            temperature: options.temperature || this.modelConfig.temperature,
            topP: options.topP !== undefined ? options.topP : options.top_p || this.modelConfig.top_p
          })
    });
    return result;
  }

  /**
   * chat（流式輸出）
   */
  async chatStream(messages, options) {
    const model = this._getModel();
    const isOpenAIModel = checkOpenAIModel(this.endpoint, this.model);
    const maxTokens = options.max_tokens || this.modelConfig.max_tokens;
    const stream = streamText({
      model,
      messages: this._convertJson(messages),
      ...(isOpenAIModel
        ? { maxCompletionTokens: maxTokens, temperature: 1 }
        : {
            maxTokens,
            temperature: options.temperature || this.modelConfig.temperature,
            topP: options.topP !== undefined ? options.topP : options.top_p || this.modelConfig.top_p
          })
    });
    return stream.toTextStreamResponse();
  }

  // 抽象方法
  _getModel() {
    throw new Error('_getModel 子類方法必須實現');
  }

  /**
   * chat（純API流式輸出）
   */
  async chatStreamAPI(messages, options) {
    const model = this._getModel();
    const modelName = resolveModelId(model, this.model);
    const isOpenAIModel = checkOpenAIModel(this.endpoint, this.model);
    const maxTokens = options.max_tokens || this.modelConfig.max_tokens;
    const payload = {
      model: modelName,
      messages: this._convertJson(messages),
      ...(isOpenAIModel
        ? { max_completion_tokens: maxTokens, temperature: 1 }
        : {
            max_tokens: maxTokens,
            send_reasoning: true,
            reasoning: true,
            temperature: options.temperature || this.modelConfig.temperature,
            top_p: options.topP !== undefined ? options.topP : options.top_p || this.modelConfig.top_p
          }),
      stream: true // 開啟流式輸出
    };

    try {
      // 發起流式請求
      const endpoint = String(this.endpoint || '').trim();
      const response = await fetch(`${endpoint.endsWith('/') ? endpoint : `${endpoint}/`}chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

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

            try {
              // 如果正在輸出思維鏈，需要先關閉思維鏈標籤
              if (isThinking) {
                controller.enqueue(encoder.encode('</think>'));
                isThinking = false;
              }

              controller.enqueue(encoder.encode(text));
            } catch (e) {
              // 忽略流已關閉或無效狀態的錯誤
              if (e.code === 'ERR_INVALID_STATE' || e.message?.includes('closed')) return;
              // 其他錯誤只打印不丟擲，避免中斷整個請求流程
              console.warn('流式輸出警告:', e.message);
            }
          };

          // 流式輸出思維鏈
          const sendReasoning = text => {
            if (!text) return;

            try {
              // 如果還沒有開始思維鏈輸出，需要先新增思維鏈標籤
              if (!isThinking) {
                controller.enqueue(encoder.encode('<think>'));
                isThinking = true;
              }

              controller.enqueue(encoder.encode(text));
            } catch (e) {
              // 忽略流已關閉或無效狀態的錯誤
              if (e.code === 'ERR_INVALID_STATE' || e.message?.includes('closed')) return;
              console.warn('流式輸出警告:', e.message);
            }
          };

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                // 流結束時，如果還在思維鏈模式，關閉標籤
                if (isThinking) {
                  try {
                    controller.enqueue(encoder.encode('</think>'));
                  } catch (e) {
                    /* ignore */
                  }
                }
                try {
                  controller.close();
                } catch (e) {
                  /* ignore */
                }
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

                if (line.startsWith('data:') && !line.includes('[DONE]')) {
                  try {
                    // 解析JSON資料
                    const jsonData = JSON.parse(line.substring(5).trim());
                    const deltaContent = jsonData.choices?.[0]?.delta?.content;
                    const deltaReasoning = jsonData.choices?.[0]?.delta?.reasoning_content;

                    // 如果有思維鏈內容，則即時流式輸出
                    if (deltaReasoning) {
                      sendReasoning(deltaReasoning);
                    }

                    // 如果有正文內容也即時輸出
                    if (deltaContent !== undefined && deltaContent !== null) {
                      sendContent(deltaContent);
                    }
                  } catch (e) {
                    // 忽略 JSON 解析錯誤，但不列印，避免日誌刷屏
                  }
                } else if (line.includes('[DONE]')) {
                  // 資料流結束，如果還在思維鏈模式，需要關閉思維鏈標籤
                  if (isThinking) {
                    try {
                      controller.enqueue(encoder.encode('</think>'));
                      isThinking = false;
                    } catch (e) {
                      // 忽略
                    }
                  }
                }

                boundary = buffer.indexOf('\n');
              }
            }
          } catch (error) {
            // 如果是流關閉導致的錯誤，直接忽略
            if (error.code === 'ERR_INVALID_STATE') {
              return;
            }
            console.error('處理資料流時出錯:', error);
            // 如果出錯時正在輸出思維鏈，嘗試關閉思維鏈標籤
            if (isThinking) {
              try {
                controller.enqueue(encoder.encode('</think>'));
              } catch (e) {
                // 忽略錯誤
              }
            }
            try {
              controller.error(error);
            } catch (e) {
              // 忽略錯誤
            }
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

  _convertJson(data) {
    return data.map(item => {
      // 只處理 role 為 "user" 的項
      if (item.role !== 'user') return item;

      const newItem = {
        role: 'user',
        content: '',
        experimental_attachments: [],
        parts: []
      };

      // 情況1：content 是字串
      if (typeof item.content === 'string') {
        newItem.content = item.content;
        newItem.parts.push({
          type: 'text',
          text: item.content
        });
      }
      // 情況2：content 是陣列
      else if (Array.isArray(item.content)) {
        item.content.forEach(contentItem => {
          if (contentItem.type === 'text') {
            // 文字內容
            newItem.content = contentItem.text;
            newItem.parts.push({
              type: 'text',
              text: contentItem.text
            });
          } else if (contentItem.type === 'image_url') {
            // 圖片內容
            const imageUrl = contentItem.image_url.url;

            // 提取檔名（如果沒有則使用預設名）
            let fileName = 'image.jpg';
            if (imageUrl.startsWith('data:')) {
              // 如果是 base64 資料，嘗試從 content type 獲取副檔名
              const match = imageUrl.match(/^data:image\/(\w+);base64/);
              if (match) {
                fileName = `image.${match[1]}`;
              }
            }

            newItem.experimental_attachments.push({
              url: imageUrl,
              name: fileName,
              contentType: imageUrl.startsWith('data:') ? imageUrl.split(';')[0].replace('data:', '') : 'image/jpeg' // 預設為 jpeg
            });
          }
        });
      }

      return newItem;
    });
  }
}

module.exports = BaseClient;
