'use client';

import { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Alert
} from '@mui/material';
import { CloudUpload as UploadIcon, Description as FileIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
// import { useDropzone } from 'react-dropzone';

/**
 * 檔案上傳步驟元件
 */
export default function FileUploadStep({ onDataLoaded, onError }) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // 健壯的CSV解析函式，支援多行欄位和引號轉義
  const parseCSV = text => {
    const result = [];
    const lines = [];
    let currentLine = '';
    let inQuotes = false;

    // 逐字元解析，正確處理引號內的換行符
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 轉義的引號
          currentLine += '"';
          i++; // 跳過下一個引號
        } else {
          // 切換引號狀態
          inQuotes = !inQuotes;
        }
      } else if (char === '\n' && !inQuotes) {
        // 行結束（不在引號內）
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
      } else {
        currentLine += char;
      }
    }

    // 新增最後一行
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    if (lines.length < 2) {
      throw new Error('CSV檔案格式不正確，至少需要標題行和一行資料');
    }

    // 解析標題行
    const headers = parseCSVLine(lines[0]);

    // 解析資料行
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length > 0) {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        result.push(obj);
      }
    }

    return result;
  };

  // 解析單行CSV，處理逗號分隔和引號轉義
  const parseCSVLine = line => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // 轉義的引號
          current += '"';
          i++; // 跳過下一個引號
        } else {
          // 切換引號狀態
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // 欄位分隔符（不在引號內）
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // 新增最後一個欄位
    result.push(current.trim());

    return result;
  };

  // 檢測並轉換ShareGPT格式為Alpaca格式
  const convertShareGPTToAlpaca = item => {
    // 檢查是否包含conversations欄位且格式正確
    if (item.conversations && Array.isArray(item.conversations)) {
      const conversations = item.conversations;

      // 查詢system、human、gpt訊息
      let systemMessage = '';
      let instruction = '';
      let output = '';

      for (const conv of conversations) {
        if (conv.from === 'system' && conv.value) {
          systemMessage = conv.value;
        } else if (conv.from === 'human' && conv.value) {
          instruction = conv.value;
        } else if (conv.from === 'gpt' && conv.value) {
          output = conv.value;
          break; // 只取第一輪對話
        }
      }

      // 如果有system訊息，將其作為instruction的字首
      if (systemMessage && instruction) {
        instruction = `${systemMessage}\n\n${instruction}`;
      } else if (systemMessage && !instruction) {
        instruction = systemMessage;
      }

      // 轉換為Alpaca格式
      return {
        instruction: instruction || '',
        input: '', // ShareGPT格式通常沒有單獨的input欄位
        output: output || '',
        // 保留其他欄位
        ...Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'conversations'))
      };
    }

    return item; // 如果不是ShareGPT格式，返回原始資料
  };

  const parseFileContent = async file => {
    const text = await file.text();
    const extension = file.name.split('.').pop().toLowerCase();

    try {
      let data = [];

      if (extension === 'json') {
        const parsed = JSON.parse(text);
        data = Array.isArray(parsed) ? parsed : [parsed];
      } else if (extension === 'jsonl') {
        data = text
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } else if (extension === 'csv') {
        // 更健壯的CSV解析，支援多行欄位和引號轉義
        data = parseCSV(text);
        if (data.length === 0) {
          throw new Error('CSV檔案格式不正確或沒有資料');
        }
      } else {
        throw new Error('不支援的檔案格式');
      }

      if (data.length === 0) {
        throw new Error('檔案中沒有找到有效資料');
      }

      // 檢測並轉換ShareGPT格式為Alpaca格式
      data = data.map(convertShareGPTToAlpaca);

      // 生成預覽資料（取前3條記錄，每個欄位值擷取前100字元）
      const previewData = data.slice(0, 3).map(item => {
        const preview = {};
        Object.keys(item).forEach(key => {
          const value = String(item[key] || '');
          preview[key] = value.length > 100 ? value.substring(0, 100) + '...' : value;
        });
        return preview;
      });

      return {
        data,
        preview: previewData,
        source: {
          type: 'file',
          fileName: file.name,
          fileSize: file.size,
          totalRecords: data.length
        }
      };
    } catch (error) {
      throw new Error(`解析檔案失敗: ${error.message}`);
    }
  };

  const handleFileSelect = async event => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);

    try {
      const result = await parseFileContent(file);
      setUploadedFiles([
        {
          name: file.name,
          size: file.size,
          status: 'success'
        }
      ]);

      onDataLoaded(result.data, result.preview, result.source);
    } catch (error) {
      setUploadedFiles([
        {
          name: file.name,
          size: file.size,
          status: 'error',
          error: error.message
        }
      ]);
      onError(error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('import.uploadFile', '上傳檔案')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('import.supportedFormats', '支援 JSON、JSONL、CSV 格式檔案')}
      </Typography>

      {/* 檔案上傳區域 */}
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          transition: 'all 0.2s ease',
          mb: 3,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
        onClick={() => document.getElementById('file-upload-input').click()}
      >
        <input
          id="file-upload-input"
          type="file"
          accept=".json,.jsonl,.csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {t('import.dragDropFile', '拖拽檔案到此處或點選選擇檔案')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('import.maxFileSize', '最大檔案大小: 50MB')}
        </Typography>
      </Paper>

      {/* 上傳進度 */}
      {uploading && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            {t('import.processingFile', '正在處理檔案...')}
          </Typography>
          <LinearProgress />
        </Box>
      )}

      {/* 已上傳檔案列表 */}
      {uploadedFiles.length > 0 && (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('import.uploadedFiles', '已上傳檔案')}
          </Typography>
          <List>
            {uploadedFiles.map((file, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemIcon>
                  {file.status === 'success' ? <CheckIcon color="success" /> : <FileIcon color="error" />}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={file.status === 'success' ? `${formatFileSize(file.size)}` : file.error}
                />
              </ListItem>
            ))}
          </List>

          {uploadedFiles.some(f => f.status === 'error') && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t('import.uploadError', '檔案上傳失敗，請檢查檔案格式是否正確')}
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
}
