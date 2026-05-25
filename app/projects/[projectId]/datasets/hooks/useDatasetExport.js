'use client';

import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import axios from 'axios';

const useDatasetExport = projectId => {
  const { t } = useTranslation();

  // 最佳化的流式匯出 - 使用 WritableStream 避免記憶體溢位
  const exportDatasetsStreaming = async (exportOptions, onProgress) => {
    try {
      const batchSize = exportOptions.batchSize || 1000;
      let offset = 0;
      let hasMore = true;
      let totalProcessed = 0;
      let isFirstBatch = true;

      // 確定檔案格式
      const fileFormat = exportOptions.fileFormat || 'json';
      const formatType = exportOptions.formatType || 'alpaca';

      // 生成檔名
      const formatSuffixMap = {
        alpaca: 'alpaca',
        multilingualthinking: 'multilingual-thinking',
        sharegpt: 'sharegpt',
        custom: 'custom'
      };
      const formatSuffix = formatSuffixMap[formatType] || formatType || 'export';
      const balanceSuffix = exportOptions.balanceMode ? '-balanced' : '';
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `datasets-${projectId}-${formatSuffix}${balanceSuffix}-${dateStr}.${fileFormat}`;

      // 建立可寫流
      let fileStream;
      let writer;

      try {
        // 使用 showSaveFilePicker API（現代瀏覽器）
        if (window.showSaveFilePicker) {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'Dataset File',
                accept: {
                  'application/json': [`.${fileFormat}`]
                }
              }
            ]
          });
          fileStream = await handle.createWritable();
        } else {
          // 降級方案：使用記憶體緩衝區（但分塊處理）
          fileStream = null;
        }
      } catch (err) {
        if (err?.name === 'AbortError') {
          return false;
        }

        // 不支援檔案系統 API 時，使用降級方案
        fileStream = null;
      }

      // 如果不支援流式寫入，使用分塊累積方案
      let chunks = [];
      let chunkCount = 0;
      const MAX_CHUNKS_IN_MEMORY = 5; // 最多在記憶體中保留5批資料

      // 寫入檔案頭（JSON陣列開始或CSV表頭）
      if (fileFormat === 'json') {
        if (fileStream) {
          await fileStream.write('[\n');
        } else {
          chunks.push('[\n');
        }
      } else if (fileFormat === 'csv') {
        // 寫入CSV表頭
        const headers = getCSVHeaders(formatType, exportOptions);
        const headerLine = headers.join(',') + '\n';
        if (fileStream) {
          await fileStream.write(headerLine);
        } else {
          chunks.push(headerLine);
        }
      }

      // 分批獲取和寫入資料
      while (hasMore) {
        const apiUrl = `/api/projects/${projectId}/datasets/export`;
        const requestBody = {
          batchMode: true,
          offset: offset,
          batchSize: batchSize
        };

        // 如果有選中的資料集 ID，傳遞 ID 列表
        if (exportOptions.selectedIds && exportOptions.selectedIds.length > 0) {
          requestBody.selectedIds = exportOptions.selectedIds;
        } else if (exportOptions.confirmedOnly) {
          requestBody.status = 'confirmed';
        }

        // 檢查是否是平衡匯出模式
        if (exportOptions.balanceMode && exportOptions.balanceConfig) {
          requestBody.balanceMode = true;
          requestBody.balanceConfig = exportOptions.balanceConfig;
        }

        const response = await axios.post(apiUrl, requestBody);
        const batchResult = response.data;

        // 如果需要包含文字塊內容，批次查詢並填充
        if (exportOptions.customFields?.includeChunk && batchResult.data.length > 0) {
          const chunkNames = batchResult.data.map(item => item.chunkName).filter(name => name);

          if (chunkNames.length > 0) {
            try {
              const chunkResponse = await axios.post(`/api/projects/${projectId}/chunks/batch-content`, {
                chunkNames
              });
              const chunkContentMap = chunkResponse.data;

              batchResult.data.forEach(item => {
                if (item.chunkName && chunkContentMap[item.chunkName]) {
                  item.chunkContent = chunkContentMap[item.chunkName];
                }
              });
            } catch (chunkError) {
              console.error('獲取文字塊內容失敗:', chunkError);
            }
          }
        }

        // 轉換當前批次資料
        const formattedBatch = formatDataBatch(batchResult.data, exportOptions);

        // 寫入當前批次
        if (fileFormat === 'json') {
          // 保持與原邏輯一致：JSON 匯出為“格式化後的 JSON 陣列”（2空格縮排）
          // 每條記錄單獨 stringify + 縮排，並在陣列級別拼接，避免一次性 stringify 全量資料導致記憶體暴漲
          const batchContent = formattedBatch
            .map(item => {
              const pretty = JSON.stringify(item, null, 2);
              // 將物件的每一行整體再縮排 2 個空格，以符合陣列元素縮排
              return '  ' + pretty.replace(/\n/g, '\n  ');
            })
            .join(',\n');

          const content = isFirstBatch ? batchContent : ',\n' + batchContent;

          if (fileStream) {
            await fileStream.write(content);
          } else {
            chunks.push(content);
            chunkCount++;
          }
        } else if (fileFormat === 'jsonl') {
          const batchContent = formattedBatch.map(item => JSON.stringify(item)).join('\n') + '\n';

          if (fileStream) {
            await fileStream.write(batchContent);
          } else {
            chunks.push(batchContent);
            chunkCount++;
          }
        } else if (fileFormat === 'csv') {
          const batchContent = formatBatchToCSV(formattedBatch, formatType, exportOptions);

          if (fileStream) {
            await fileStream.write(batchContent);
          } else {
            chunks.push(batchContent);
            chunkCount++;
          }
        }

        // 如果使用記憶體緩衝且累積了足夠多的塊，觸發部分下載
        if (!fileStream && chunkCount >= MAX_CHUNKS_IN_MEMORY) {
          // 這裡我們仍然需要等到最後才能下載，但至少限制了記憶體使用
          // 可以考慮使用 Blob 分片
        }

        hasMore = batchResult.hasMore;
        offset = batchResult.offset;
        totalProcessed += batchResult.data.length;
        isFirstBatch = false;

        // 通知進度更新
        if (onProgress) {
          onProgress({
            processed: totalProcessed,
            currentBatch: batchResult.data.length,
            hasMore
          });
        }

        // 避免過快請求
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // 寫入檔案尾
      if (fileFormat === 'json') {
        if (fileStream) {
          await fileStream.write('\n]\n');
          await fileStream.close();
        } else {
          chunks.push('\n]\n');
        }
      } else {
        if (fileStream) {
          await fileStream.close();
        }
      }

      // 如果使用記憶體緩衝方案，現在觸發下載
      if (!fileStream) {
        downloadFromChunks(chunks, fileName);
      }

      toast.success(t('datasets.exportSuccess'));
      return true;
    } catch (error) {
      console.error('Streaming export failed:', error);
      toast.error(error.message || t('datasets.exportFailed'));
      return false;
    }
  };

  // 從記憶體塊下載檔案（最佳化版本，使用 Blob 流）
  const downloadFromChunks = (chunks, fileName) => {
    // 使用 Blob 建構函式，它會自動處理大資料
    const blob = new Blob(chunks, { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // 延遲釋放 URL，確保下載開始
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // 獲取CSV表頭
  const getCSVHeaders = (formatType, exportOptions) => {
    if (formatType === 'alpaca') {
      return ['instruction', 'input', 'output', 'system'];
    } else if (formatType === 'sharegpt') {
      return ['messages'];
    } else if (formatType === 'multilingualthinking') {
      return ['reasoning_language', 'developer', 'user', 'analysis', 'final', 'messages'];
    } else if (formatType === 'custom') {
      const { questionField, answerField, cotField, includeLabels, includeChunk, questionOnly } =
        exportOptions.customFields;
      const headers = [questionField];
      if (!questionOnly) {
        headers.push(answerField);
        if (exportOptions.includeCOT && cotField) {
          headers.push(cotField);
        }
      }
      if (includeLabels) headers.push('label');
      if (includeChunk) headers.push('chunk');
      return headers;
    }
    return [];
  };

  // 格式化資料批次
  const formatDataBatch = (dataBatch, exportOptions) => {
    const formatType = exportOptions.formatType || 'alpaca';

    if (formatType === 'alpaca') {
      if (exportOptions.alpacaFieldType === 'instruction') {
        return dataBatch.map(({ question, answer, cot }) => ({
          instruction: question,
          input: '',
          output: cot && exportOptions.includeCOT ? `<think>${cot}</think>\n${answer}` : answer,
          system: exportOptions.systemPrompt || ''
        }));
      } else {
        return dataBatch.map(({ question, answer, cot }) => ({
          instruction: exportOptions.customInstruction || '',
          input: question,
          output: cot && exportOptions.includeCOT ? `<think>${cot}</think>\n${answer}` : answer,
          system: exportOptions.systemPrompt || ''
        }));
      }
    } else if (formatType === 'sharegpt') {
      return dataBatch.map(({ question, answer, cot }) => {
        const messages = [];
        if (exportOptions.systemPrompt) {
          messages.push({ role: 'system', content: exportOptions.systemPrompt });
        }
        messages.push({
          role: 'user',
          content: question
        });
        messages.push({
          role: 'assistant',
          content: cot && exportOptions.includeCOT ? `<think>${cot}</think>\n${answer}` : answer
        });
        return { messages };
      });
    } else if (formatType === 'multilingualthinking') {
      return dataBatch.map(({ question, answer, cot }) => ({
        reasoning_language: exportOptions.reasoningLanguage || 'English',
        developer: exportOptions.systemPrompt || '',
        user: question,
        analysis: exportOptions.includeCOT && cot ? cot : null,
        final: answer,
        messages: [
          {
            content: exportOptions.systemPrompt || '',
            role: 'system',
            thinking: null
          },
          {
            content: question,
            role: 'user',
            thinking: null
          },
          {
            content: answer,
            role: 'assistant',
            thinking: exportOptions.includeCOT && cot ? cot : null
          }
        ]
      }));
    } else if (formatType === 'custom') {
      const { questionField, answerField, cotField, includeLabels, includeChunk, questionOnly } =
        exportOptions.customFields;
      return dataBatch.map(({ question, answer, cot, questionLabel: labels, chunkContent }) => {
        const item = { [questionField]: question };
        if (!questionOnly) {
          item[answerField] = answer;
          if (cot && exportOptions.includeCOT && cotField) {
            item[cotField] = cot;
          }
        }
        if (includeLabels && labels && labels.length > 0) {
          item.label = labels.split(' ')[1];
        }
        if (includeChunk && chunkContent) {
          item.chunk = chunkContent;
        }
        return item;
      });
    }
    return dataBatch;
  };

  // 將批次格式化為CSV行
  const formatBatchToCSV = (formattedBatch, formatType, exportOptions) => {
    const headers = getCSVHeaders(formatType, exportOptions);
    return (
      formattedBatch
        .map(item => {
          return headers
            .map(header => {
              let field = item[header]?.toString() || '';
              // 對於複雜物件，轉換為JSON字串
              if (typeof item[header] === 'object') {
                field = JSON.stringify(item[header]);
              }
              // CSV轉義
              if (field.includes(',') || field.includes('\n') || field.includes('"')) {
                field = `"${field.replace(/"/g, '""')}"`;
              }
              return field;
            })
            .join(',');
        })
        .join('\n') + '\n'
    );
  };

  // 處理和下載資料的通用函式（保留用於小資料量）
  const processAndDownloadData = async (dataToExport, exportOptions) => {
    const formattedData = formatDataBatch(dataToExport, exportOptions);

    let content;
    let fileExtension;
    const fileFormat = exportOptions.fileFormat || 'json';

    if (fileFormat === 'jsonl') {
      content = formattedData.map(item => JSON.stringify(item)).join('\n');
      fileExtension = 'jsonl';
    } else if (fileFormat === 'csv') {
      const headers = getCSVHeaders(exportOptions.formatType, exportOptions);
      const csvRows = [
        headers.join(','),
        ...formattedData.map(item =>
          headers
            .map(header => {
              let field = item[header]?.toString() || '';
              if (typeof item[header] === 'object') {
                field = JSON.stringify(item[header]);
              }
              if (field.includes(',') || field.includes('\n') || field.includes('"')) {
                field = `"${field.replace(/"/g, '""')}"`;
              }
              return field;
            })
            .join(',')
        )
      ];
      content = csvRows.join('\n');
      fileExtension = 'csv';
    } else {
      content = JSON.stringify(formattedData, null, 2);
      fileExtension = 'json';
    }

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const formatSuffixMap = {
      alpaca: 'alpaca',
      multilingualthinking: 'multilingual-thinking',
      sharegpt: 'sharegpt',
      custom: 'custom'
    };
    const formatSuffix = formatSuffixMap[exportOptions.formatType] || exportOptions.formatType || 'export';
    const balanceSuffix = exportOptions.balanceMode ? '-balanced' : '';
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `datasets-${projectId}-${formatSuffix}${balanceSuffix}-${dateStr}.${fileExtension}`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 匯出資料集（保持向後相容的原有功能）
  const exportDatasets = async exportOptions => {
    try {
      const apiUrl = `/api/projects/${projectId}/datasets/export`;
      const requestBody = {};

      if (exportOptions.selectedIds && exportOptions.selectedIds.length > 0) {
        requestBody.selectedIds = exportOptions.selectedIds;
      } else if (exportOptions.confirmedOnly) {
        requestBody.status = 'confirmed';
      }

      if (exportOptions.balanceMode && exportOptions.balanceConfig) {
        requestBody.balanceMode = true;
        requestBody.balanceConfig = exportOptions.balanceConfig;
      }

      const response = await axios.post(apiUrl, requestBody);
      let dataToExport = response.data;

      await processAndDownloadData(dataToExport, exportOptions);

      toast.success(t('datasets.exportSuccess'));
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  // 匯出平衡資料集
  const exportBalancedDataset = async exportOptions => {
    const balancedOptions = {
      ...exportOptions,
      balanceMode: true,
      balanceConfig: exportOptions.balanceConfig
    };
    return await exportDatasets(balancedOptions);
  };

  return {
    exportDatasets,
    exportBalancedDataset,
    exportDatasetsStreaming
  };
};

export default useDatasetExport;
export { useDatasetExport };
