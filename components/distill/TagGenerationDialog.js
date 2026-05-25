'use client';

import { useState, useEffect } from 'react';
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
  Chip,
  Paper,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import i18n from '@/lib/i18n';

/**
 * 標籤生成對話方塊元件
 * @param {Object} props
 * @param {boolean} props.open - 對話方塊是否開啟
 * @param {Function} props.onClose - 關閉對話方塊的回撥函式
 * @param {Function} props.onGenerated - 標籤生成完成的回撥函式
 * @param {string} props.projectId - 專案ID
 * @param {Object} props.parentTag - 父標籤物件，為null時表示生成根標籤
 * @param {string} props.tagPath - 標籤鏈路
 * @param {Object} props.model - 選擇的模型配置
 */
export default function TagGenerationDialog({ open, onClose, onGenerated, projectId, parentTag, tagPath, model }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [count, setCount] = useState(5);
  const [generatedTags, setGeneratedTags] = useState([]);
  const [parentTagName, setParentTagName] = useState('');
  const [project, setProject] = useState(null);

  // 獲取專案資訊，如果是頂級標籤，預設填寫專案名稱
  useEffect(() => {
    if (projectId && !parentTag) {
      axios
        .get(`/api/projects/${projectId}`)
        .then(response => {
          setProject(response.data);
          setParentTagName(response.data.name || '');
        })
        .catch(error => {
          console.error('獲取專案資訊失敗:', error);
        });
    } else if (parentTag) {
      setParentTagName(parentTag.label || '');
    }
  }, [projectId, parentTag]);

  // 處理生成標籤
  const handleGenerateTags = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post(`/api/projects/${projectId}/distill/tags`, {
        parentTag: parentTagName,
        parentTagId: parentTag ? parentTag.id : null,
        tagPath: tagPath || parentTagName,
        count,
        model,
        language: i18n.language
      });

      setGeneratedTags(response.data);
    } catch (error) {
      console.error('生成標籤失敗:', error);
      setError(error.response?.data?.error || t('distill.generateTagsError'));
    } finally {
      setLoading(false);
    }
  };

  // 處理生成完成
  const handleGenerateComplete = async () => {
    if (onGenerated) {
      onGenerated(generatedTags);
    }
    handleClose();
  };

  // 處理關閉對話方塊
  const handleClose = () => {
    setGeneratedTags([]);
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
          {parentTag
            ? t('distill.generateSubTagsTitle', { parentTag: parentTag.label })
            : t('distill.generateRootTagsTitle')}
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

        {/* 標籤路徑顯示 */}
        {parentTag && tagPath && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('distill.tagPath')}:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, backgroundColor: 'background.paper' }}>
              <Typography variant="body1">{tagPath || parentTag.label}</Typography>
            </Paper>
          </Box>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('distill.parentTag')}:
          </Typography>

          <TextField
            fullWidth
            variant="outlined"
            value={parentTagName}
            onChange={e => setParentTagName(e.target.value)}
            placeholder={t('distill.parentTagPlaceholder')}
            disabled={loading || !parentTag}
            // 如果是頂級標籤，設定為只讀
            InputProps={{
              readOnly: !parentTag
            }}
            // 顯示適當的幫助文字
            helperText={
              !parentTag
                ? t('distill.rootTopicHelperText', { defaultValue: '使用專案名稱作為頂級主題' })
                : t('distill.parentTagHelp')
            }
          />
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            {t('distill.tagCount')}:
          </Typography>
          <TextField
            fullWidth
            variant="outlined"
            type="number"
            value={count}
            onChange={handleCountChange}
            inputProps={{ min: 1, max: 100 }}
            disabled={loading}
            helperText={t('distill.tagCountHelp')}
          />
        </Box>

        {generatedTags.length > 0 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('distill.generatedTags')}:
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, backgroundColor: 'background.paper' }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {generatedTags.map((tag, index) => (
                  <Chip key={index} label={tag.label} color="primary" variant="outlined" />
                ))}
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">
          {t('common.cancel')}
        </Button>
        {generatedTags.length > 0 ? (
          <Button onClick={handleGenerateComplete} color="primary" variant="contained">
            {t('common.complete')}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={handleGenerateTags}
            disabled={loading || !parentTagName}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {loading ? t('common.generating') : t('distill.generateTags')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
