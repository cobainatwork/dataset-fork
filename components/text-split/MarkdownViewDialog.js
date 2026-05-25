'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Typography,
  Divider,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
  DialogContentText
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import 'github-markdown-css/github-markdown-light.css';

export default function MarkdownViewDialog({ open, text, onClose, projectId, onSaveSuccess }) {
  const { t } = useTranslation();
  const [customSplitMode, setCustomSplitMode] = useState(false);
  const [splitPoints, setSplitPoints] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const contentRef = useRef(null);
  const [chunksPreview, setChunksPreview] = useState([]);

  // 根據分塊點計算每個塊的字數
  const calculateChunksPreview = points => {
    if (!text || !text.content) return [];

    const content = text.content;
    const sortedPoints = [...points].sort((a, b) => a.position - b.position);

    const chunks = [];
    let startPos = 0;

    // 計算每個分塊
    for (let i = 0; i < sortedPoints.length; i++) {
      const endPos = sortedPoints[i].position;
      const chunkContent = content.substring(startPos, endPos);

      if (chunkContent.trim().length > 0) {
        chunks.push({
          index: i + 1,
          length: chunkContent.length,
          preview: chunkContent.substring(0, 20) + (chunkContent.length > 20 ? '...' : '')
        });
      }

      startPos = endPos;
    }

    // 新增最後一個分塊
    const lastChunkContent = content.substring(startPos);
    if (lastChunkContent.trim().length > 0) {
      chunks.push({
        index: chunks.length + 1,
        length: lastChunkContent.length,
        preview: lastChunkContent.substring(0, 20) + (lastChunkContent.length > 20 ? '...' : '')
      });
    }

    return chunks;
  };

  // 重置元件狀態
  useEffect(() => {
    if (!open) {
      setSplitPoints([]);
      setCustomSplitMode(false);
      setSelectedText('');
      setSavedMessage('');
    }
  }, [open]);

  // 當分塊點變化時更新預覽
  useEffect(() => {
    if (splitPoints.length > 0 && text?.content) {
      const preview = calculateChunksPreview(splitPoints);
      setChunksPreview(preview);
    } else {
      setChunksPreview([]);
    }
  }, [splitPoints, text?.content]);

  // 處理使用者選擇文字事件
  const handleTextSelection = () => {
    if (!customSplitMode) return;

    const selection = window.getSelection();
    if (!selection.toString().trim()) return;

    // 獲取選擇的文字內容和位置
    const selectedContent = selection.toString();

    // 計算選擇位置在文件中的偏移量
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(contentRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    const position = preCaretRange.toString().length;

    // 新增到分割點列表
    const newPoint = {
      id: Date.now(),
      position,
      preview: selectedContent.substring(0, 40) + (selectedContent.length > 40 ? '...' : '')
    };

    setSplitPoints(prev => [...prev, newPoint].sort((a, b) => a.position - b.position));
    setSelectedText('');
  };

  // 刪除分割點
  const handleDeletePoint = id => {
    setSplitPoints(prev => prev.filter(point => point.id !== id));
  };

  // 彈出確認對話方塊
  const handleConfirmSave = () => {
    setConfirmDialogOpen(true);
  };

  // 取消儲存
  const handleCancelSave = () => {
    setConfirmDialogOpen(false);
  };

  // 確認並執行儲存
  const handleSavePoints = async () => {
    // 輸出除錯資訊
    console.log('儲存分塊點時的資料:', {
      projectId,
      text: text
        ? {
            fileId: text.fileId,
            fileName: text.fileName,
            contentLength: text.content ? text.content.length : 0
          }
        : null,
      splitPointsCount: splitPoints.length
    });

    if (!text) {
      setError(t('textSplit.missingRequiredData') + ': text 為空');
      return;
    }

    if (!text.fileId) {
      setError(t('textSplit.missingRequiredData') + ': fileId 不存在');
      return;
    }

    if (!text.fileName) {
      setError(t('textSplit.missingRequiredData') + ': fileName 不存在');
      return;
    }

    if (!text.content) {
      setError(t('textSplit.missingRequiredData') + ': content 不存在');
      return;
    }

    if (!projectId) {
      setError(t('textSplit.missingRequiredData') + ': projectId 不存在');
      return;
    }

    setConfirmDialogOpen(false);
    setSaving(true);
    setError('');

    try {
      // 準備要傳送的資料
      const customSplitData = {
        fileId: text.fileId,
        fileName: text.fileName,
        content: text.content,
        splitPoints: splitPoints.map(point => ({
          position: point.position,
          preview: point.preview
        }))
      };

      // 傳送請求到待建立的API介面
      const response = await fetch(`/api/projects/${projectId}/custom-split`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(customSplitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('textSplit.customSplitFailed'));
      }

      // 儲存成功
      setSavedMessage(t('textSplit.customSplitSuccess'));

      // 短暫顯示成功訊息後關閉對話方塊並重新整理列表
      setTimeout(() => {
        setSavedMessage('');

        // 關閉對話方塊
        onClose();

        // 呼叫父元件的重新整理方法（如果提供了）
        if (typeof onSaveSuccess === 'function') {
          onSaveSuccess();
        }
      }, 1500);
    } catch (err) {
      console.error('儲存自定義分塊出錯:', err);
      setError(err.message || t('textSplit.customSplitFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{text ? text.fileName : ''}</Typography>
        <FormControlLabel
          control={
            <Switch checked={customSplitMode} onChange={e => setCustomSplitMode(e.target.checked)} color="primary" />
          }
          label={t('textSplit.customSplitMode')}
          sx={{ ml: 2 }}
        />
      </DialogTitle>

      {customSplitMode && (
        <Box sx={{ px: 3, py: 1, bgcolor: 'action.hover' }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            {t('textSplit.customSplitInstructions')}
          </Typography>

          {/* 分割點列表 */}
          {splitPoints.length > 0 && (
            <Box sx={{ mt: 1, mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {t('textSplit.splitPointsList')} ({splitPoints.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {splitPoints.map((point, index) => (
                  <Chip
                    key={point.id}
                    label={`${index + 1}. ${point.preview}`}
                    onDelete={() => handleDeletePoint(point.id)}
                    deleteIcon={<DeleteIcon />}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>

              {/* 文字塊字數預覽 */}
              {chunksPreview.length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    {t('textSplit.chunksPreview')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {chunksPreview.map(chunk => (
                      <Chip
                        key={chunk.index}
                        size="small"
                        label={`${t('textSplit.chunk')} ${chunk.index}: ${chunk.length}${t('textSplit.characters')}`}
                        color="info"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* 儲存按鈕 */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={splitPoints.length === 0 || saving}
              onClick={handleConfirmSave}
              size="small"
            >
              {saving ? t('common.saving') : t('textSplit.saveSplitPoints')}
            </Button>
          </Box>

          {/* 提示訊息 */}
          {savedMessage && (
            <Alert severity="success" sx={{ mt: 1 }}>
              {savedMessage}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
        </Box>
      )}

      <Divider />

      <DialogContent dividers>
        {text ? (
          <Box
            sx={{
              maxHeight: '60vh',
              overflow: 'auto',
              cursor: customSplitMode ? 'text' : 'default',
              position: 'relative',
              '::selection': {
                backgroundColor: customSplitMode ? 'primary.light' : 'inherit',
                color: customSplitMode ? 'primary.contrastText' : 'inherit'
              }
            }}
            onMouseUp={handleTextSelection}
            ref={contentRef}
          >
            {/* 渲染帶有分割點標記的內容 */}
            {customSplitMode && splitPoints.length > 0 ? (
              <Box>
                <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'inherit' }}>
                  {text.content.split('').map((char, index) => {
                    const isSplitPoint = splitPoints.some(point => point.position === index);
                    const splitPointIndex = splitPoints.findIndex(point => point.position === index);

                    if (isSplitPoint) {
                      return (
                        <React.Fragment key={index}>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '100%',
                              borderTop: '2px dashed #1976d2',
                              marginTop: '8px',
                              marginBottom: '8px',
                              position: 'relative'
                            }}
                          >
                            <span
                              style={{
                                position: 'absolute',
                                left: '0',
                                top: '-15px',
                                backgroundColor: '#1976d2',
                                color: 'white',
                                padding: '0 6px',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}
                            >
                              {splitPointIndex + 1}
                            </span>
                          </span>
                          {char}
                        </React.Fragment>
                      );
                    }
                    return char;
                  })}
                </pre>
              </Box>
            ) : (
              <Box>
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{text.content}</ReactMarkdown>
                </div>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>

      {/* 確認對話方塊 */}
      <Dialog
        open={confirmDialogOpen}
        onClose={handleCancelSave}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{t('textSplit.confirmCustomSplitTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t('textSplit.confirmCustomSplitMessage')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelSave}>{t('common.cancel')}</Button>
          <Button onClick={handleSavePoints} color="primary" variant="contained" autoFocus>
            {t('common.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
