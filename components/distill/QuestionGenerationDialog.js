'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Paper,
  IconButton,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import i18n from '@/lib/i18n';

/**
 * 問題生成對話方塊元件
 * @param {Object} props
 * @param {boolean} props.open - 對話方塊是否開啟
 * @param {Function} props.onClose - 關閉對話方塊的回撥函式
 * @param {Function} props.onGenerated - 問題生成完成的回撥函式
 * @param {string} props.projectId - 專案ID
 * @param {Object} props.tag - 標籤物件
 * @param {string} props.tagPath - 標籤路徑
 * @param {Object} props.model - 選擇的模型配置
 */
export default function QuestionGenerationDialog({ open, onClose, onGenerated, projectId, tag, tagPath, model }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(5);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  // 處理生成問題
  const handleGenerateQuestions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post(`/api/projects/${projectId}/distill/questions`, {
        tagPath,
        currentTag: tag.label,
        tagId: tag.id,
        count,
        model,
        language: i18n.language
      });

      setGeneratedQuestions(response.data);
    } catch (error) {
      console.error('生成問題失敗:', error);
      setError(error.response?.data?.error || t('distill.generateQuestionsError'));
    } finally {
      setLoading(false);
    }
  };

  // 處理生成完成
  const handleGenerateComplete = async () => {
    if (onGenerated) {
      onGenerated(generatedQuestions);
    }
    handleClose();
  };

  // 處理關閉對話方塊
  const handleClose = () => {
    setGeneratedQuestions([]);
    setError('');
    setCount(5);
    if (onClose) {
      onClose();
    }
  };

  // 處理數量變化
  const handleCountChange = event => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= 1 && value <= 100) {
      setCount(value);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="div">
          {t('distill.generateQuestionsTitle', { tag: tag?.label || t('distill.unknownTag') })}
        </Typography>
        <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('distill.tagPath')}:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, backgroundColor: 'background.paper' }}>
            <Typography variant="body1">{tagPath || tag?.label || t('distill.unknownTag')}</Typography>
          </Paper>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('distill.questionCount')}:
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            type="number"
            value={count}
            onChange={handleCountChange}
            inputProps={{ min: 1, max: 100 }}
            disabled={loading}
            helperText={t('distill.questionCountHelp')}
          />
        </Box>

        {generatedQuestions.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('distill.generatedQuestions')}:
            </Typography>
            <Paper variant="outlined" sx={{ p: 0, borderRadius: 1, backgroundColor: 'background.paper' }}>
              <List disablePadding>
                {generatedQuestions.map((question, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={question.question}
                        primaryTypographyProps={{
                          style: { whiteSpace: 'normal', wordBreak: 'break-word' }
                        }}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          {t('common.cancel')}
        </Button>
        {generatedQuestions.length > 0 ? (
          <Button onClick={handleGenerateComplete} color="primary" variant="contained">
            {t('common.complete')}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateQuestions}
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {loading ? t('common.generating') : t('distill.generateQuestions')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
