'use client';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import axios from 'axios';

const useImageDatasetExport = projectId => {
  const { t } = useTranslation();

  /**
   * 解析標籤格式的答案
   * 如果答案是 JSON 陣列格式，解析並用逗號連線
   */
  const parseAnswerLabels = item => {
    const { answer, answerType } = item;
    if (answerType !== 'label' || !answer) {
      return answer;
    }

    try {
      // 嘗試解析 JSON
      const parsed = JSON.parse(answer);
      if (Array.isArray(parsed)) {
        // 如果是陣列，用逗號連線
        return parsed.join(', ');
      }
      return answer;
    } catch (e) {
      // 不是 JSON 格式，直接返回原答案
      return answer;
    }
  };

  /**
   * 匯出圖片資料集
   */
  const exportImageDatasets = async exportOptions => {
    try {
      // 1. 獲取資料集資料
      const apiUrl = `/api/projects/${projectId}/image-datasets/export`;
      const response = await axios.post(apiUrl, {
        confirmedOnly: exportOptions.confirmedOnly
      });

      let datasets = response.data;

      if (!datasets || datasets.length === 0) {
        toast.warning(t('imageDatasets.noDataToExport', '沒有可匯出的資料'));
        return false;
      }

      // 2. 處理答案中的標籤格式
      datasets = datasets.map(item => ({
        ...item,
        answer: parseAnswerLabels(item)
      }));

      // 3. 根據格式型別轉換資料
      let formattedData;

      if (exportOptions.formatType === 'raw') {
        // 原始格式：直接匯出資料集
        formattedData = datasets.map(item => {
          const result = { ...item };

          // 如果需要包含圖片路徑
          if (exportOptions.includeImagePath && item.imageName) {
            result.image_path = `/images/${item.imageName}`;
          }

          if (item.answerType === 'custom_format') {
            try {
              result.answerObj = JSON.parse(item.answer);
            } catch {}
          }

          return result;
        });
      } else if (exportOptions.formatType === 'alpaca') {
        formattedData = datasets.map(({ question, answer, imageName }) => {
          const item = {
            instruction: question,
            input: '',
            output: answer
          };

          // 如果需要包含圖片路徑
          if (exportOptions.includeImagePath && imageName) {
            item.images = [`/images/${imageName}`];
          }

          return item;
        });
      } else if (exportOptions.formatType === 'sharegpt') {
        formattedData = datasets.map(({ question, answer, imageName }) => {
          const messages = [];

          // 新增系統提示詞（如果有）
          if (exportOptions.systemPrompt) {
            messages.push({
              role: 'system',
              content: exportOptions.systemPrompt
            });
          }

          // 新增使用者問題
          const userContent = [];

          // 如果需要包含圖片路徑
          if (exportOptions.includeImagePath && imageName) {
            userContent.push({
              type: 'image_url',
              image_url: {
                url: `/images/${imageName}`
              }
            });
          }

          userContent.push({
            type: 'text',
            text: question
          });

          messages.push({
            role: 'user',
            content: userContent
          });

          // 新增助手回答
          messages.push({
            role: 'assistant',
            content: answer
          });

          return { messages };
        });
      }

      // 4. 生成 JSON 檔案
      const jsonContent = JSON.stringify(formattedData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const formatSuffix = exportOptions.formatType;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `image-datasets-${projectId}-${formatSuffix}-${dateStr}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t('imageDatasets.exportSuccess', '資料集匯出成功'));

      // 5. 如果需要匯出圖片，呼叫壓縮包介面
      if (exportOptions.exportImages) {
        try {
          const params = new URLSearchParams({
            confirmedOnly: exportOptions.confirmedOnly.toString()
          });

          const zipUrl = `/api/projects/${projectId}/image-datasets/export-zip?${params.toString()}`;

          // 建立一個隱藏的 a 標籤來觸發下載
          const a = document.createElement('a');
          a.href = zipUrl;
          a.style.display = 'none';
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);

          toast.success(t('imageDatasets.exportImagesSuccess', '圖片壓縮包匯出成功'));
        } catch (error) {
          console.error('Failed to export images:', error);
          toast.error(t('imageDatasets.exportImagesFailed', '圖片匯出失敗'));
        }
      }

      return true;
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(error.message || t('imageDatasets.exportFailed', '匯出失敗'));
      return false;
    }
  };

  return {
    exportImageDatasets
  };
};

export default useImageDatasetExport;
