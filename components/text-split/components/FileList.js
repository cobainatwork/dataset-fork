'use client';

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControlLabel,
  Switch,
  Pagination,
  TextField,
  InputAdornment,
  Grid,
  Alert
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Download,
  Delete as DeleteIcon,
  FilePresent as FileIcon,
  Psychology as PsychologyIcon,
  CheckBox as SelectAllIcon,
  CheckBoxOutlineBlank as DeselectAllIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { selectedModelInfoAtom } from '@/lib/store';
import MarkdownViewDialog from '../MarkdownViewDialog';
import GaPairsIndicator from '../../mga/GaPairsIndicator';
import DomainTreeActionDialog from './DomainTreeActionDialog';
import i18n from '@/lib/i18n';
import { toast } from 'sonner';

export default function FileList({
  theme,
  files = {},
  loading = false,
  onDeleteFile,
  sendToFileUploader,
  projectId,
  setPageLoading,
  currentPage = 1,
  onPageChange,
  onRefresh, // 新增：重新整理檔案列表的回撥函式
  isFullscreen = false // 新增引數，用於控制是否處於全屏狀態
}) {
  const { t } = useTranslation();

  // 現有的狀態
  const [array, setArray] = useState([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewContent, setViewContent] = useState('');

  // 新增的批次生成GA對相關狀態
  const [batchGenDialogOpen, setBatchGenDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [genResult, setGenResult] = useState(null);
  const [projectModel, setProjectModel] = useState(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [appendMode, setAppendMode] = useState(false);
  const [generationMode, setGenerationMode] = useState('ai'); // 'ai' 或 'manual'
  const [manualGaPair, setManualGaPair] = useState({
    genreTitle: '',
    genreDesc: '',
    audienceTitle: '',
    audienceDesc: ''
  });

  // 批次刪除相關狀態
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [domainTreeActionOpen, setDomainTreeActionOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 搜尋相關狀態
  const [searchTerm, setSearchTerm] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // 獲取當前選中的模型資訊
  const selectedModelInfo = useAtomValue(selectedModelInfoAtom);

  // 後端搜尋功能
  const handleSearch = async searchValue => {
    if (typeof onPageChange === 'function') {
      setSearchLoading(true);
      try {
        // 呼叫父元件的頁面變更函式，傳遞搜尋引數
        await onPageChange(1, searchValue); // 搜尋時重置到第一頁
      } catch (error) {
        console.error('搜尋失敗:', error);
      } finally {
        setSearchLoading(false);
      }
    }
  };

  // 防抖搜尋
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchTerm);
    }, 500); // 500ms 防抖

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 清空搜尋
  const handleClearSearch = () => {
    setSearchTerm('');
    // 清空搜尋時立即觸發搜尋
    handleSearch('');
  };

  const handleCheckboxChange = (fileId, isChecked) => {
    setArray(prevArray => {
      let newArray;
      const stringFileId = String(fileId);

      if (isChecked) {
        newArray = prevArray.includes(stringFileId) ? prevArray : [...prevArray, stringFileId];
      } else {
        newArray = prevArray.filter(item => item !== stringFileId);
      }

      if (typeof sendToFileUploader === 'function') {
        sendToFileUploader(newArray);
      }
      return newArray;
    });
  };

  // 全選檔案（包括所有頁面的檔案）
  const handleSelectAll = async () => {
    try {
      // 獲取專案中所有檔案的ID
      const response = await fetch(`/api/projects/${projectId}/files?getAllIds=true`);
      if (!response.ok) {
        throw new Error('獲取檔案列表失敗');
      }

      const data = await response.json();
      const allFileIds = data.allFileIds || [];

      setArray(allFileIds);
      if (typeof sendToFileUploader === 'function') {
        sendToFileUploader(allFileIds);
      }
    } catch (error) {
      console.error('全選檔案失敗:', error);
      // 如果API呼叫失敗，回退到選擇當前頁面的檔案
      if (files?.data?.length > 0) {
        const currentPageFileIds = files.data.map(file => String(file.id));
        setArray(currentPageFileIds);
        if (typeof sendToFileUploader === 'function') {
          sendToFileUploader(currentPageFileIds);
        }
      }
    }
  };
  // 取消全選
  const handleDeselectAll = () => {
    setArray([]);
    if (typeof sendToFileUploader === 'function') {
      sendToFileUploader([]);
    }
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
  };

  // 重新整理文字塊列表
  const refreshTextChunks = () => {
    if (typeof setPageLoading === 'function') {
      setPageLoading(true);
      setTimeout(() => {
        // 可能需要呼叫父元件的重新整理方法
        sendToFileUploader(array);
        setPageLoading(false);
      }, 500);
    }
  };

  const handleViewContent = async fileId => {
    getFileContent(fileId);
    setViewDialogOpen(true);
  };

  const handleDownload = async (fileId, fileName) => {
    setPageLoading(true);
    const text = await getFileContent(fileId);

    // Modify the filename if it ends with .pdf
    let downloadName = fileName || 'download.txt';
    if (downloadName.toLowerCase().endsWith('.pdf')) {
      downloadName = downloadName.slice(0, -4) + '.md';
    }

    const blob = new Blob([text.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setPageLoading(false);
  };

  const getFileContent = async fileId => {
    try {
      const response = await fetch(`/api/projects/${projectId}/preview/${fileId}`);
      if (!response.ok) {
        throw new Error(t('textSplit.fetchChunksFailed'));
      }
      const data = await response.json();
      setViewContent(data);
      return data;
    } catch (error) {
      console.error(t('textSplit.fetchChunksError'), error);
    }
  };

  const formatFileSize = size => {
    if (size < 1024) {
      return size + 'B';
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + 'KB';
    } else if (size < 1024 * 1024 * 1024) {
      return (size / 1024 / 1024).toFixed(2) + 'MB';
    } else {
      return (size / 1024 / 1024 / 1024).toFixed(2) + 'GB';
    }
  };

  // 新增：獲取專案特定的預設模型資訊
  const fetchProjectModel = async () => {
    try {
      setLoadingModel(true);

      // 首先獲取專案資訊
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error(t('gaPairs.fetchProjectInfoFailed', { status: response.status }));
      }

      const projectData = await response.json();

      // 獲取模型配置
      const modelResponse = await fetch(`/api/projects/${projectId}/model-config`);
      if (!modelResponse.ok) {
        throw new Error(t('gaPairs.fetchModelConfigFailed', { status: modelResponse.status }));
      }

      const modelConfigData = await modelResponse.json();

      if (modelConfigData.data && Array.isArray(modelConfigData.data)) {
        // 優先使用專案預設模型
        let targetModel = null;

        if (projectData.defaultModelConfigId) {
          targetModel = modelConfigData.data.find(model => model.id === projectData.defaultModelConfigId);
        }

        // 如果沒有預設模型，使用第一個可用的模型
        if (!targetModel) {
          targetModel = modelConfigData.data.find(
            m => m.modelName && m.endpoint && (m.providerId === 'ollama' || m.apiKey)
          );
        }

        if (targetModel) {
          setProjectModel(targetModel);
        }
      }
    } catch (error) {
      console.error(t('gaPairs.fetchProjectModelError'), error);
    } finally {
      setLoadingModel(false);
    }
  };

  // 新增：批次生成GA對的處理函式
  const handleBatchGenerateGAPairs = async () => {
    if (array.length === 0) {
      setGenError(t('gaPairs.selectAtLeastOneFile'));
      return;
    }

    // 如果是手動新增模式，驗證手動輸入的 GA 對
    if (generationMode === 'manual') {
      if (!manualGaPair.genreTitle || !manualGaPair.audienceTitle) {
        setGenError(t('gaPairs.manualGaPairRequired'));
        return;
      }

      try {
        setGenerating(true);
        setGenError(null);
        setGenResult(null);

        const stringFileIds = array.map(id => String(id));

        const requestData = {
          fileIds: stringFileIds,
          gaPair: manualGaPair,
          appendMode: appendMode
        };

        const response = await fetch(`/api/projects/${projectId}/batch-add-manual-ga`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestData)
        });

        const responseText = await response.text();

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: t('gaPairs.requestFailed', { status: response.status }) }));
          throw new Error(errorData.error || t('gaPairs.requestFailed', { status: response.status }));
        }

        const result = JSON.parse(responseText);

        if (result.success) {
          setGenResult({
            total: result.data?.length || 0,
            success: result.data?.filter(r => r.success).length || 0
          });

          // 成功後清空選擇狀態和表單
          setArray([]);
          if (typeof sendToFileUploader === 'function') {
            sendToFileUploader([]);
          }
          setManualGaPair({
            genreTitle: '',
            genreDesc: '',
            audienceTitle: '',
            audienceDesc: ''
          });

          // 傳送全域性重新整理事件
          const successfulFileIds = result.data?.filter(item => item.success)?.map(item => String(item.fileId)) || [];

          if (successfulFileIds.length > 0) {
            window.dispatchEvent(
              new CustomEvent('refreshGaPairsIndicators', {
                detail: {
                  projectId,
                  fileIds: successfulFileIds
                }
              })
            );
          }
        } else {
          setGenError(result.error || t('gaPairs.generationFailed'));
        }
      } catch (error) {
        console.error(t('gaPairs.batchGenerationFailed'), error);
        setGenError(t('gaPairs.generationError', { error: error.message || t('common.unknownError') }));
      } finally {
        setGenerating(false);
      }
      return;
    }

    // AI 生成模式
    const modelToUse = projectModel || selectedModelInfo;

    if (!modelToUse || !modelToUse.id) {
      setGenError(t('gaPairs.noDefaultModel'));
      return;
    }

    // 檢查模型配置是否完整
    if (!modelToUse.modelName || !modelToUse.endpoint) {
      setGenError('模型配置不完整，請檢查模型設定');
      return;
    }

    // 檢查API金鑰（除了ollama模型）
    if (modelToUse.providerId !== 'ollama' && !modelToUse.apiKey) {
      setGenError(t('gaPairs.missingApiKey'));
      return;
    }

    try {
      setGenerating(true);
      setGenError(null);
      setGenResult(null);

      const stringFileIds = array.map(id => String(id));

      // 獲取當前語言環境
      const currentLanguage = i18n.language;

      const requestData = {
        fileIds: stringFileIds,
        modelConfigId: modelToUse.id,
        language: currentLanguage,
        appendMode: appendMode
      };

      const response = await fetch(`/api/projects/${projectId}/batch-generateGA`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const responseText = await response.text();

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: t('gaPairs.requestFailed', { status: response.status }) }));
        throw new Error(errorData.error || t('gaPairs.requestFailed', { status: response.status }));
      }

      const result = JSON.parse(responseText);

      if (result.success) {
        setGenResult({
          total: result.data?.length || 0,
          success: result.data?.filter(r => r.success).length || 0
        });

        // 成功後清空選擇狀態
        setArray([]);
        if (typeof sendToFileUploader === 'function') {
          sendToFileUploader([]);
        }

        console.log(t('gaPairs.batchGenerationSuccess', { count: result.summary?.success || 0 }));

        //傳送全域性重新整理事件
        const successfulFileIds = result.data?.filter(item => item.success)?.map(item => String(item.fileId)) || [];

        if (successfulFileIds.length > 0) {
          window.dispatchEvent(
            new CustomEvent('refreshGaPairsIndicators', {
              detail: {
                projectId,
                fileIds: successfulFileIds
              }
            })
          );
        }
      } else {
        setGenError(result.error || t('gaPairs.generationFailed'));
      }
    } catch (error) {
      console.error(t('gaPairs.batchGenerationFailed'), error);
      setGenError(t('gaPairs.generationError', { error: error.message || t('common.unknownError') }));
    } finally {
      setGenerating(false);
    }
  };

  // 新增：開啟批次生成對話方塊
  const openBatchGenDialog = () => {
    // 如果沒有選中檔案，自動選中所有檔案
    if (array.length === 0 && files?.data?.length > 0) {
      const allFileIds = files.data.map(file => String(file.id));
      setArray(allFileIds);
      if (typeof sendToFileUploader === 'function') {
        sendToFileUploader(allFileIds);
      }
    }

    // 獲取專案模型配置
    fetchProjectModel();
    setBatchGenDialogOpen(true);
  };

  // 新增：關閉批次生成對話方塊
  const closeBatchGenDialog = () => {
    setBatchGenDialogOpen(false);
    setGenError(null);
    setGenResult(null);
    setAppendMode(false); // 重置追加模式
  };

  // 批次刪除處理函式 - 第一步：開啟確認對話方塊
  const handleBatchDelete = () => {
    if (array.length === 0) {
      return;
    }
    setBatchDeleteDialogOpen(true);
  };

  // 確認批次刪除 - 第二步：開啟領域樹選擇對話方塊
  const confirmBatchDelete = () => {
    setBatchDeleteDialogOpen(false);

    // 檢查是否還有其他檔案
    const remainingFilesCount = files.total - array.length;

    // 如果刪除後沒有檔案了，直接執行刪除（keep 模式）
    if (remainingFilesCount === 0) {
      executeBatchDelete('keep');
      return;
    }

    // 否則開啟領域樹操作選擇對話方塊
    setDomainTreeActionOpen(true);
  };

  // 處理領域樹操作選擇
  const handleDomainTreeAction = action => {
    setDomainTreeActionOpen(false);
    executeBatchDelete(action);
  };

  // 執行批次刪除 - 第三步：實際刪除操作
  const executeBatchDelete = async domainTreeAction => {
    if (array.length === 0) {
      return;
    }

    setDeleting(true);
    // 設定頁面 loading 狀態
    if (typeof setPageLoading === 'function') {
      setPageLoading(true);
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/batch-delete-files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileIds: array,
          domainTreeAction,
          model: selectedModelInfo || {},
          language: i18n.language
        })
      });

      if (!response.ok) {
        throw new Error('批次刪除失敗');
      }

      const result = await response.json();

      // 清空選擇
      setArray([]);
      if (typeof sendToFileUploader === 'function') {
        sendToFileUploader([]);
      }

      // 重新整理檔案列表
      if (typeof onRefresh === 'function') {
        await onRefresh();
      } else if (typeof onPageChange === 'function') {
        // 回退方案：如果沒有 onRefresh，使用 onPageChange
        await onPageChange(1);
      }

      toast.success(
        t('textSplit.batchDeleteSuccess', {
          count: result.deletedCount || array.length,
          defaultValue: `成功刪除 ${result.deletedCount || array.length} 個檔案`
        })
      );
    } catch (error) {
      console.error('批次刪除檔案失敗:', error);
      toast.error(t('textSplit.batchDeleteFailed', { defaultValue: '批次刪除失敗' }));
    } finally {
      setDeleting(false);
      // 清除頁面 loading 狀態
      if (typeof setPageLoading === 'function') {
        setPageLoading(false);
      }
    }
  };

  // 取消批次刪除
  const cancelBatchDelete = () => {
    setBatchDeleteDialogOpen(false);
  };

  return (
    <Box
      sx={{
        height: '100%',
        p: 3,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        bgcolor: theme.palette.background.paper,
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden'
      }}
    >
      {/* 標題和按鈕區域 */}
      <Box sx={{ mb: 2 }}>
        {/* 第一行：標題和按鈕 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: isFullscreen && files.total > 0 ? 2 : 0
          }}
        >
          <Typography variant="subtitle1">{t('textSplit.uploadedDocuments', { count: files.total })}</Typography>

          {/* 批次操作按鈕 */}
          {files.total > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* 全選/取消全選按鈕 */}
              {array.length === files.total ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SelectAllIcon />}
                  onClick={handleDeselectAll}
                  disabled={loading}
                >
                  {t('gaPairs.deselectAllFiles')}
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DeselectAllIcon />}
                  onClick={handleSelectAll}
                  disabled={loading}
                >
                  {t('gaPairs.selectAllFiles')}
                </Button>
              )}

              {/* 批次刪除按鈕 */}
              {array.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteIcon />}
                  onClick={handleBatchDelete}
                  disabled={loading}
                >
                  {t('textSplit.batchDelete', { count: array.length })}
                </Button>
              )}

              {/* 批次生成GA對按鈕 */}
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<PsychologyIcon />}
                onClick={openBatchGenDialog}
                disabled={loading}
              >
                {t('gaPairs.batchGenerate')}
              </Button>
            </Box>
          )}
        </Box>

        {/* 第二行：搜尋框 - 在全屏展示時顯示，或者有搜尋內容時顯示 */}
        {isFullscreen && (files.total > 0 || searchTerm) && (
          <Box>
            <TextField
              size="small"
              placeholder={t('textSplit.searchFiles', { defaultValue: '搜尋檔名...' })}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch} edge="end">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ width: '100%', maxWidth: 400 }}
            />
            {(searchTerm || searchLoading) && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                {searchLoading
                  ? '搜尋中...'
                  : searchTerm
                    ? t('textSplit.searchResults', {
                        count: files?.data?.length || 0,
                        total: files.total,
                        defaultValue: `找到 ${files?.data?.length || 0} 個檔案（共 ${files.total} 個）`
                      })
                    : null}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : files.total === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            {searchTerm
              ? // 搜尋無結果
                t('textSplit.noSearchResults', {
                  searchTerm,
                  defaultValue: `未找到包含 "${searchTerm}" 的檔案`
                })
              : // 真的沒有上傳檔案
                t('textSplit.noFilesUploaded', {
                  defaultValue: '暫未上傳檔案'
                })}
          </Typography>
        </Box>
      ) : !files?.data || files.data.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            {searchTerm
              ? // 搜尋有結果但當前頁沒資料
                t('textSplit.noResultsOnCurrentPage', {
                  defaultValue: '當前頁面沒有搜尋結果，請返回第一頁檢視'
                })
              : // 當前頁沒資料但總數不為0
                t('textSplit.noDataOnCurrentPage', {
                  defaultValue: '當前頁面沒有資料'
                })}
          </Typography>
        </Box>
      ) : (
        <>
          <List
            sx={{
              maxHeight: isFullscreen ? 'none' : '200px', // 根據 isFullscreen 控制最大高度
              overflow: 'auto',
              width: '100%'
            }}
            dense // 使列表項更緊湊，減少高度
          >
            {files?.data?.map((file, index) => (
              <Box key={index}>
                <ListItem
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'nowrap',
                    pr: 0 // 移除右側內邊距，便於自定義操作區域位置
                  }}
                >
                  {/* 檔案資訊區域 */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      overflow: 'hidden', // 隱藏溢位內容
                      maxWidth: '70%', // 限制檔案資訊區域最大寬度
                      flexGrow: 1,
                      mr: 2 // 與操作區域保持間距
                    }}
                  >
                    <FileIcon color="primary" sx={{ mr: 1, flexShrink: 0 }} />
                    <Tooltip title={`${file.fileName}（${t('textSplit.viewDetails')}）`}>
                      <ListItemText
                        style={{ cursor: 'pointer', overflow: 'hidden' }}
                        onClick={() => handleViewContent(file.id)}
                        primary={
                          <Typography
                            noWrap // 文字不換行並顯示省略號
                            variant="body1"
                            component="div"
                          >
                            {file.fileName}
                          </Typography>
                        }
                        secondary={
                          <Typography
                            noWrap // 文字不換行並顯示省略號
                            variant="body2"
                            color="textSecondary"
                            component="div"
                          >
                            {`${formatFileSize(file.size)} · ${new Date(file.createAt).toLocaleString()}`}
                          </Typography>
                        }
                      />
                    </Tooltip>
                  </Box>

                  {/* 操作按鈕區域 */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexShrink: 0, // 防止操作區域被壓縮
                      alignItems: 'center'
                    }}
                  >
                    <Checkbox
                      sx={{ ml: 1 }}
                      checked={array.includes(String(file.id))}
                      onChange={e => handleCheckboxChange(file.id, e.target.checked)}
                    />
                    <GaPairsIndicator projectId={projectId} fileId={file.id} fileName={file.fileName} />
                    <Tooltip title={t('textSplit.download')}>
                      <IconButton color="primary" onClick={() => handleDownload(file.id, file.fileName)}>
                        <Download />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t('textSplit.deleteFile')}>
                      <IconButton color="error" onClick={() => onDeleteFile(file.id, file.fileName)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItem>
                {index < files.data.length - 1 && <Divider />}
              </Box>
            ))}
          </List>

          {/* 分頁控制元件 */}
          {files.total > 10 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={Math.ceil(files.total / 10)} // 假設每頁10個檔案
                page={currentPage}
                onChange={(event, page) => onPageChange && onPageChange(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* 現有的文字塊詳情對話方塊 */}
      <MarkdownViewDialog
        open={viewDialogOpen}
        text={viewContent}
        onClose={handleCloseViewDialog}
        projectId={projectId}
        onSaveSuccess={refreshTextChunks}
      />

      {/* 新增：批次生成GA對對話方塊 */}
      <Dialog open={batchGenDialogOpen} onClose={closeBatchGenDialog} maxWidth="md" fullWidth>
        <DialogTitle>{t('gaPairs.batchGenerateTitle')}</DialogTitle>
        <DialogContent>
          {!genResult && (
            <DialogContentText>
              {t('gaPairs.batchGenerateDescription', { count: array.length })}

              {/* 生成方式選擇 */}
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('gaPairs.generationMode')}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={generationMode === 'manual'}
                      onChange={e => setGenerationMode(e.target.checked ? 'manual' : 'ai')}
                      color="primary"
                    />
                  }
                  label={generationMode === 'manual' ? t('gaPairs.manualAddMode') : t('gaPairs.aiGenerateMode')}
                />
              </Box>

              {/* AI 生成模式：顯示模型資訊 */}
              {generationMode === 'ai' && (
                <>
                  {loadingModel ? (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      <Typography variant="body2">{t('gaPairs.loadingProjectModel')}</Typography>
                    </Box>
                  ) : projectModel ? (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        {t('gaPairs.usingModel')}:{' '}
                        <strong>
                          {projectModel.providerName}: {projectModel.modelName}
                        </strong>
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="error">
                        {t('gaPairs.noDefaultModel')}
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {/* 手動新增模式：顯示輸入表單 */}
              {generationMode === 'manual' && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('gaPairs.genreTitle')}
                        value={manualGaPair.genreTitle}
                        onChange={e => setManualGaPair({ ...manualGaPair, genreTitle: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('gaPairs.genreDesc')}
                        value={manualGaPair.genreDesc}
                        onChange={e => setManualGaPair({ ...manualGaPair, genreDesc: e.target.value })}
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('gaPairs.audienceTitle')}
                        value={manualGaPair.audienceTitle}
                        onChange={e => setManualGaPair({ ...manualGaPair, audienceTitle: e.target.value })}
                        required
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={t('gaPairs.audienceDesc')}
                        value={manualGaPair.audienceDesc}
                        onChange={e => setManualGaPair({ ...manualGaPair, audienceDesc: e.target.value })}
                        multiline
                        rows={2}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* 追加模式選擇 */}
              <Box sx={{ mt: 2, mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch checked={appendMode} onChange={e => setAppendMode(e.target.checked)} color="primary" />
                  }
                  label={`${t('gaPairs.appendMode')}（${t('gaPairs.appendModeDescription')}）`}
                />
              </Box>
            </DialogContentText>
          )}

          {genError && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
              <Typography variant="body2" color="error.contrastText">
                {genError}
              </Typography>
            </Box>
          )}

          {genResult && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="body2" color="success.contrastText">
                {t('gaPairs.batchGenCompleted', { success: genResult.success, total: genResult.total })}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeBatchGenDialog}>{genResult ? t('common.close') : t('common.cancel')}</Button>
          {!genResult && (
            <Button
              onClick={handleBatchGenerateGAPairs}
              variant="contained"
              disabled={
                generating ||
                array.length === 0 ||
                (generationMode === 'ai' && !projectModel) ||
                (generationMode === 'manual' && (!manualGaPair.genreTitle || !manualGaPair.audienceTitle))
              }
              startIcon={generating ? <CircularProgress size={20} /> : <PsychologyIcon />}
            >
              {generating
                ? t('gaPairs.generating')
                : generationMode === 'manual'
                  ? t('gaPairs.batchAddManual')
                  : t('gaPairs.startGeneration')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 批次刪除確認對話方塊 */}
      <Dialog open={batchDeleteDialogOpen} onClose={cancelBatchDelete} maxWidth="sm" fullWidth>
        <DialogTitle>{t('textSplit.batchDeleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('textSplit.batchDeleteConfirm', {
              count: array.length,
              defaultValue: `確定要刪除選中的 ${array.length} 個檔案嗎？此操作不可恢復。`
            })}
          </DialogContentText>
          <Alert severity="warning" sx={{ my: 2 }}>
            <Typography variant="body2" component="div" fontWeight="medium">
              {t('textSplit.deleteFileWarning')}
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" component="div">
                • {t('textSplit.deleteFileWarningChunks')}
              </Typography>
              <Typography variant="body2" component="div">
                • {t('textSplit.deleteFileWarningQuestions')}
              </Typography>
              <Typography variant="body2" component="div">
                • {t('textSplit.deleteFileWarningDatasets')}
              </Typography>
            </Box>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelBatchDelete}>{t('common.cancel')}</Button>
          <Button onClick={confirmBatchDelete} variant="contained" color="error">
            {t('common.confirmDelete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 領域樹操作選擇對話方塊 */}
      <DomainTreeActionDialog
        open={domainTreeActionOpen}
        onClose={() => setDomainTreeActionOpen(false)}
        onConfirm={handleDomainTreeAction}
        isFirstUpload={false}
        action="delete"
      />
    </Box>
  );
}
