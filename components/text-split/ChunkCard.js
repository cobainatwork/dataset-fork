'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Checkbox,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import QuizIcon from '@mui/icons-material/Quiz';
import EditIcon from '@mui/icons-material/Edit';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

// 編輯文字塊對話方塊元件
const EditChunkDialog = ({ open, chunk, onClose, onSave }) => {
  const [content, setContent] = useState(chunk?.content || '');
  const { t } = useTranslation();

  // 當文字塊變化時更新內容
  useEffect(() => {
    if (chunk?.content) {
      setContent(chunk.content);
    }
  }, [chunk]);

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('textSplit.editChunk', { chunkId: chunk?.name })}</DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          multiline
          rows={15}
          value={content}
          onChange={e => setContent(e.target.value)}
          variant="outlined"
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {t('common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function ChunkCard({
  chunk,
  selected,
  onSelect,
  onView,
  onDelete,
  onGenerateQuestions,
  onDataCleaning,
  onEdit,
  onGenerateEvalQuestions, // 新增：生成測評題目的回撥
  projectId,
  selectedModel // 新增selectedModel引數
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [chunkForEdit, setChunkForEdit] = useState(null);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingEval, setGeneratingEval] = useState(false);

  // 獲取文字預覽
  const getTextPreview = (content, maxLength = 150) => {
    if (!content) return '';
    return content.length > maxLength ? `${content.substring(0, maxLength)}...` : content;
  };

  // 檢查是否有已生成的問題
  const hasQuestions = chunk.questions && chunk.questions.length > 0;

  // 處理編輯按鈕點選
  const handleEditClick = async () => {
    try {
      // 顯示載入狀態
      console.log('正在獲取文字塊完整內容...');
      console.log('projectId:', projectId, 'chunkId:', chunk.id);

      // 先獲取完整的文字塊內容，使用從外部傳入的 projectId
      const response = await fetch(`/api/projects/${projectId}/chunks/${encodeURIComponent(chunk.id)}`);

      if (!response.ok) {
        throw new Error(t('textSplit.fetchChunkFailed'));
      }

      const data = await response.json();
      console.log('獲取文字塊完整內容成功:', data);

      // 先設定完整資料，再開啟對話方塊（與 ChunkList.js 中的實現一致）
      setChunkForEdit(data);
      setEditDialogOpen(true);
    } catch (error) {
      console.error(t('textSplit.fetchChunkError'), error);
      // 如果出錯，使用原始預覽資料
      alert(t('textSplit.fetchChunkError'));
    }
  };

  // 處理儲存編輯內容
  const handleSaveEdit = newContent => {
    if (onEdit) {
      onEdit(chunk.id, newContent);
    }
  };

  // 處理生成單個問題 - 後臺執行，不阻塞UI
  const handleGenerateQuestionsClick = async () => {
    setGeneratingQuestions(true);
    try {
      await onGenerateQuestions([chunk.id]);
    } finally {
      // Always release loading state, even when generation fails.
      setTimeout(() => {
        setGeneratingQuestions(false);
      }, 500);
    }
  };

  // 處理生成測評題目
  const handleGenerateEvalQuestionsClick = async () => {
    if (!onGenerateEvalQuestions) return;

    setGeneratingEval(true);
    try {
      await onGenerateEvalQuestions(chunk.id);
    } finally {
      // 延遲關閉載入狀態
      setTimeout(() => {
        setGeneratingEval(false);
      }, 500);
    }
  };

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          mb: 1,
          position: 'relative',
          transition: 'all 0.2s ease-in-out',
          borderColor: selected ? theme.palette.primary.main : theme.palette.divider,
          bgcolor: selected ? `${theme.palette.primary.main}10` : 'transparent',
          borderRadius: 2,
          '&:hover': {
            borderColor: theme.palette.primary.main,
            transform: 'translateY(-2px)',
            boxShadow: `0 4px 12px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`
          }
        }}
      >
        <CardContent sx={{ pt: 2.5, px: 2.5, pb: '16px !important' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
            <Checkbox
              checked={selected}
              onChange={onSelect}
              sx={{
                mr: 1,
                '&.Mui-checked': {
                  color: theme.palette.primary.main
                }
              }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1.5,
                  flexWrap: 'wrap',
                  gap: 1
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="600"
                  sx={{
                    color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.dark
                  }}
                >
                  {chunk.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={`${chunk.fileName || t('textSplit.unknownFile')}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{
                      borderRadius: 1,
                      fontWeight: 500,
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                  <Chip
                    label={`${chunk.size || 0} ${t('textSplit.characters')}`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                    sx={{
                      borderRadius: 1,
                      fontWeight: 500,
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                  {chunk.Questions.length > 0 && (
                    <Tooltip
                      title={
                        <Box sx={{ p: 1 }} style={{ maxHeight: '200px', overflow: 'auto' }}>
                          {chunk.Questions.map((q, index) => (
                            <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                              {index + 1}. {q.question}
                            </Typography>
                          ))}
                        </Box>
                      }
                      arrow
                      placement="top"
                    >
                      <Chip
                        label={`${t('textSplit.generatedQuestions', { count: chunk.Questions.length })}`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{
                          borderRadius: 1,
                          fontWeight: 500,
                          '& .MuiChip-label': { px: 1 }
                        }}
                        onClick={() => {
                          if (!projectId) return;
                          router.push(`/projects/${projectId}/questions`);
                        }}
                      />
                    </Tooltip>
                  )}
                  {chunk.EvalDatasets && chunk.EvalDatasets.length > 0 && (
                    <Chip
                      label={`${t('textSplit.generatedEvalQuestions', { count: chunk.EvalDatasets.length })}`}
                      size="small"
                      color="secondary"
                      variant="outlined"
                      sx={{
                        borderRadius: 1,
                        fontWeight: 500,
                        '& .MuiChip-label': { px: 1 }
                      }}
                      onClick={() => {
                        if (!projectId) return;
                        router.push(`/projects/${projectId}/eval-datasets`);
                      }}
                    />
                  )}
                </Box>
              </Box>

              <Typography
                variant="body2"
                color="textSecondary"
                sx={{
                  mb: 1,
                  lineHeight: 1.6,
                  opacity: 0.85
                }}
              >
                {getTextPreview(chunk.content)}
              </Typography>
            </Box>
          </Box>
        </CardContent>

        <CardActions
          sx={{
            justifyContent: 'flex-end',
            px: 2.5,
            pb: 2,
            gap: 1,
            '& .MuiIconButton-root': {
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'scale(1.1)'
              }
            }
          }}
        >
          <Tooltip title={t('datasets.viewDetails')}>
            <IconButton
              size="small"
              color="primary"
              onClick={onView}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.08)' : 'rgba(33, 150, 243, 0.08)'
              }}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={
              selectedModel?.id
                ? t('textSplit.generateQuestions')
                : t('textSplit.selectModelFirst', { defaultValue: '請先在右上角選擇模型' })
            }
          >
            <span>
              <IconButton
                size="small"
                color="info"
                onClick={handleGenerateQuestionsClick}
                disabled={!selectedModel?.id || generatingQuestions}
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(41, 182, 246, 0.08)' : 'rgba(2, 136, 209, 0.08)',
                  '&.Mui-disabled': {
                    opacity: 0.6,
                    pointerEvents: 'auto' // 允許滑鼠懸停顯示tooltip
                  }
                }}
              >
                {generatingQuestions ? <CircularProgress size={20} color="inherit" /> : <QuizIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip
            title={
              selectedModel?.id
                ? t('textSplit.generateEvalQuestions', { defaultValue: '生成測試集' })
                : t('textSplit.selectModelFirst', { defaultValue: '請先在右上角選擇模型' })
            }
          >
            <span>
              <IconButton
                size="small"
                color="secondary"
                onClick={handleGenerateEvalQuestionsClick}
                disabled={!selectedModel?.id || generatingEval}
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(156, 39, 176, 0.08)' : 'rgba(123, 31, 162, 0.08)',
                  '&.Mui-disabled': {
                    opacity: 0.6,
                    pointerEvents: 'auto'
                  }
                }}
              >
                {generatingEval ? <CircularProgress size={20} color="inherit" /> : <AssignmentIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip
            title={
              selectedModel?.id
                ? t('textSplit.dataCleaning', { defaultValue: '資料清洗' })
                : t('textSplit.selectModelFirst', { defaultValue: '請先在右上角選擇模型' })
            }
          >
            <span>
              <IconButton
                size="small"
                color="success"
                onClick={onDataCleaning}
                disabled={!selectedModel?.id}
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.08)' : 'rgba(46, 125, 50, 0.08)',
                  '&.Mui-disabled': {
                    opacity: 0.6,
                    pointerEvents: 'auto' // 允許滑鼠懸停顯示tooltip
                  }
                }}
              >
                <CleaningServicesIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={t('textSplit.editChunk', { chunkId: chunk.name })}>
            <IconButton
              size="small"
              color="warning"
              onClick={handleEditClick}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.08)' : 'rgba(237, 108, 2, 0.08)'
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              color="error"
              onClick={onDelete}
              sx={{
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.08)' : 'rgba(211, 47, 47, 0.08)'
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>

      {/* 編輯文字塊對話方塊 */}
      <EditChunkDialog
        open={editDialogOpen}
        chunk={chunkForEdit || chunk}
        onClose={() => {
          setEditDialogOpen(false);
          setChunkForEdit(null);
        }}
        onSave={handleSaveEdit}
      />
    </>
  );
}
