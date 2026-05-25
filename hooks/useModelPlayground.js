'use client';

import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai/index';
import { modelConfigListAtom } from '@/lib/store';

export default function useModelPlayground(projectId, defaultModelId = null) {
  // 狀態管理
  const [selectedModels, setSelectedModels] = useState(defaultModelId ? [defaultModelId] : []);
  const [loading, setLoading] = useState({});
  const [userInput, setUserInput] = useState('');
  const [conversations, setConversations] = useState({});
  const [error, setError] = useState(null);
  const [outputMode, setOutputMode] = useState('normal'); // 'normal' 或 'streaming'
  const [uploadedImage, setUploadedImage] = useState(null); // 儲存上傳的圖片Base64

  const availableModels = useAtomValue(modelConfigListAtom);

  // 初始化會話狀態
  useEffect(() => {
    if (selectedModels.length > 0) {
      const initialConversations = {};
      selectedModels.forEach(modelId => {
        if (!conversations[modelId]) {
          initialConversations[modelId] = [];
        }
      });

      if (Object.keys(initialConversations).length > 0) {
        setConversations(prev => ({
          ...prev,
          ...initialConversations
        }));
      }
    }
  }, [selectedModels]);

  // 處理模型選擇
  const handleModelSelection = event => {
    const {
      target: { value }
    } = event;

    // 限制最多選擇 3 個模型
    const selectedValues = typeof value === 'string' ? value.split(',') : value;
    const limitedSelection = selectedValues.slice(0, 3);

    setSelectedModels(limitedSelection);
  };

  // 處理使用者輸入
  const handleInputChange = e => {
    setUserInput(e.target.value);
  };

  // 處理圖片上傳
  const handleImageUpload = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 刪除已上傳的圖片
  const handleRemoveImage = () => {
    setUploadedImage(null);
  };

  // 處理輸出模式切換
  const handleOutputModeChange = event => {
    setOutputMode(event.target.value);
  };

  // 傳送訊息給所有選中的模型
  const handleSendMessage = async () => {
    if (!userInput.trim() || Object.values(loading).some(value => value) || selectedModels.length === 0) return;

    // 獲取使用者輸入
    const input = userInput.trim();
    setUserInput('');

    // 獲取圖片（如果有的話）
    const image = uploadedImage;
    setUploadedImage(null); // 清除圖片

    // 更新所有選中模型的對話
    const updatedConversations = { ...conversations };
    selectedModels.forEach(modelId => {
      if (!updatedConversations[modelId]) {
        updatedConversations[modelId] = [];
      }
      // 檢查是否有圖片並且當前模型是視覺模型
      const model = availableModels.find(m => m.id === modelId);
      const isVisionModel = model && model.type === 'vision';

      if (isVisionModel && image) {
        // 如果是視覺模型並且有圖片，使用複合格式
        updatedConversations[modelId].push({
          role: 'user',
          content: [
            { type: 'text', text: input || '請描述這個圖片' },
            { type: 'image_url', image_url: { url: image } }
          ]
        });
      } else {
        // 其他情況使用純文字
        updatedConversations[modelId].push({
          role: 'user',
          content: input
        });
      }
    });

    setConversations(updatedConversations);

    // 為每個模型設定獨立的載入狀態
    const updatedLoading = {};
    selectedModels.forEach(modelId => {
      updatedLoading[modelId] = true;
    });
    setLoading(updatedLoading);

    // 為每個模型單獨傳送請求
    selectedModels.forEach(async modelId => {
      const model = availableModels.find(m => m.id === modelId);
      if (!model) {
        // 模型配置不存在
        const modelConversation = [...(updatedConversations[modelId] || [])];

        // 更新對話狀態
        setConversations(prev => ({
          ...prev,
          [modelId]: [...modelConversation, { role: 'error', content: '模型配置不存在' }]
        }));

        // 更新載入狀態
        setLoading(prev => ({ ...prev, [modelId]: false }));
        return;
      }

      try {
        // 檢查是否是視覺模型且有圖片
        const isVisionModel = model.type === 'vision';

        // 構建請求訊息
        let requestMessages = [...updatedConversations[modelId]]; // 複製當前訊息歷史

        // 如果是vision模型並且有圖片，將最後一條使用者訊息替換為包含圖片的訊息
        if (isVisionModel && image && requestMessages.length > 0) {
          // 找到最後一條使用者訊息
          const lastUserMsgIndex = requestMessages.length - 1;
          // 替換為包含圖片的訊息
          requestMessages[lastUserMsgIndex] = {
            role: 'user',
            content: [
              { type: 'text', text: input || '請描述這個圖片' },
              { type: 'image_url', image_url: { url: image } }
            ]
          };
        }

        // 根據輸出模式選擇不同的處理方式
        if (outputMode === 'streaming') {
          // 流式輸出處理
          // 先新增一個空的助手回覆，用於後續流式更新
          setConversations(prev => {
            const modelConversation = [...(prev[modelId] || [])];
            return {
              ...prev,
              [modelId]: [
                ...modelConversation,
                {
                  role: 'assistant',
                  content: '',
                  isStreaming: true,
                  thinking: '', // 新增推理過程欄位
                  showThinking: true // 預設顯示推理過程
                }
              ]
            };
          });

          const response = await fetch(`/api/projects/${projectId}/playground/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model,
              messages: requestMessages
            })
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let accumulatedContent = '';

          // 狀態變數，用於跟蹤是否正在處理思維鏈
          let isInThinking = false;
          let currentThinking = '';
          let currentContent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 解碼收到的資料塊
            const chunk = decoder.decode(value, { stream: true });

            // 處理當前資料塊
            for (let i = 0; i < chunk.length; i++) {
              const char = chunk[i];

              // 檢測開始標籤 <think>
              if (i + 6 <= chunk.length && chunk.substring(i, i + 7) === '<think>') {
                isInThinking = true;
                i += 6; // 跳過標籤
                continue;
              }

              // 檢測結束標籤 </think>
              if (i + 7 <= chunk.length && chunk.substring(i, i + 8) === '</think>') {
                isInThinking = false;
                i += 7; // 跳過標籤
                continue;
              }

              // 根據當前狀態新增到對應內容中
              if (isInThinking) {
                currentThinking += char;
              } else {
                currentContent += char;
              }
            }

            // 累積全部內容以便最終處理
            accumulatedContent += chunk;

            // 更新對話內容
            setConversations(prev => {
              const modelConversation = [...prev[modelId]];
              const lastIndex = modelConversation.length - 1;

              // 更新最後一條訊息的內容，包括思維鏈
              modelConversation[lastIndex] = {
                ...modelConversation[lastIndex],
                content: currentContent,
                thinking: currentThinking,
                showThinking: currentThinking.length > 0 // 只要有思維鏈內容就顯示
              };

              return {
                ...prev,
                [modelId]: modelConversation
              };
            });
          }

          // 完成流式傳輸，移除流式標記
          // 使用剛剛即時跟蹤的 currentThinking 和 currentContent作為最終的思維鏈和內容
          let finalThinking = currentThinking;
          let finalAnswer = currentContent;

          // 如果到流結束時還在思維鏈中，確保解析完整的思維鏈內容
          if (isInThinking) {
            console.log('警告: 流結束時仍在思維鏈中，可能有標籤不完整');
            isInThinking = false;
          }

          setConversations(prev => {
            const modelConversation = [...prev[modelId]];
            const lastIndex = modelConversation.length - 1;

            // 更新最後一條訊息，移除流式標記
            modelConversation[lastIndex] = {
              role: 'assistant',
              content: finalAnswer,
              thinking: finalThinking,
              showThinking: finalThinking ? true : false,
              isStreaming: false
            };

            return {
              ...prev,
              [modelId]: modelConversation
            };
          });
        } else {
          // 普通輸出處理
          const response = await fetch(`/api/projects/${projectId}/playground/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: {
                ...model,
                extra_body: { enable_thinking: true } // 啟用思考鏈
              },
              messages: requestMessages
            })
          });

          // 獲取響應資料
          const data = await response.json();

          // 獨立更新此模型的對話狀態
          setConversations(prev => {
            const modelConversation = [...(prev[modelId] || [])];

            if (response.ok) {
              // 處理可能包含思考鏈的內容
              let thinking = '';
              let content = data.response;

              // 檢查是否包含思考鏈
              if (content && content.includes('<think>')) {
                const thinkParts = content.split(/<think>(.*?)<\/think>/s);
                if (thinkParts.length >= 3) {
                  thinking = thinkParts[1] || '';
                  // 移除思考鏈部分，只保留最終回答
                  content = thinkParts.filter((_, i) => i % 2 === 0).join('');
                }
              }

              return {
                ...prev,
                [modelId]: [
                  ...modelConversation,
                  {
                    role: 'assistant',
                    content: content,
                    thinking: thinking,
                    showThinking: thinking ? true : false
                  }
                ]
              };
            } else {
              return {
                ...prev,
                [modelId]: [...modelConversation, { role: 'error', content: `錯誤: ${data.error || '請求失敗'}` }]
              };
            }
          });
        }
      } catch (error) {
        console.error(`請求模型 ${model.name} 失敗:`, error);

        // 獨立更新此模型的對話狀態 - 新增錯誤訊息
        setConversations(prev => {
          const modelConversation = [...(prev[modelId] || [])];
          return {
            ...prev,
            [modelId]: [...modelConversation, { role: 'error', content: `錯誤: ${error.message}` }]
          };
        });
      } finally {
        // 更新此模型的載入狀態
        setLoading(prev => ({ ...prev, [modelId]: false }));
      }
    });
  };

  // 清空所有對話
  const handleClearConversations = () => {
    const clearedConversations = {};
    selectedModels.forEach(modelId => {
      clearedConversations[modelId] = [];
    });
    setConversations(clearedConversations);
    setLoading({});
  };

  // 獲取模型名稱
  const getModelName = modelId => {
    const model = availableModels.find(m => m.id === modelId);
    return model ? `${model.provider}: ${model.name}` : modelId;
  };

  return {
    availableModels,
    selectedModels,
    loading,
    userInput,
    conversations,
    error,
    outputMode,
    uploadedImage,
    handleModelSelection,
    handleInputChange,
    handleImageUpload,
    handleRemoveImage,
    handleSendMessage,
    handleClearConversations,
    handleOutputModeChange,
    getModelName
  };
}
