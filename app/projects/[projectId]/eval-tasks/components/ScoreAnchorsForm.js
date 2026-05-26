'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RestoreIcon from '@mui/icons-material/Restore';
import { useTranslation } from 'react-i18next';
import { getDefaultScoreAnchors } from '@/lib/llm/prompts/llmJudge';

/**
 * 評分規則表單元件
 * 用於自定義簡答題和開放題的評分規則
 */
export default function ScoreAnchorsForm({
  questionType, // 'short_answer' 或 'open_ended'
  scoreAnchors,
  onChange,
  language = 'zh-TW'
}) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // 獲取當前語言
  const currentLanguage = i18n.language;

  // 初始化評分規則（如果為空）
  useEffect(() => {
    if (!scoreAnchors || scoreAnchors.length === 0) {
      onChange(getDefaultScoreAnchors(questionType, currentLanguage));
    }
  }, [questionType, currentLanguage]);

  // 處理單個規則的描述更改
  const handleDescriptionChange = (index, newDescription) => {
    const newAnchors = [...scoreAnchors];
    newAnchors[index] = { ...newAnchors[index], description: newDescription };
    onChange(newAnchors);
  };

  // 恢復預設值
  const handleRestore = () => {
    onChange(getDefaultScoreAnchors(questionType, currentLanguage));
  };

  // 獲取題型顯示名稱
  const getQuestionTypeName = () => {
    if (questionType === 'short_answer') {
      return t('evalTasks.shortAnswer', '簡答題');
    }
    return t('evalTasks.openEnded', '開放題');
  };

  // 獲取分數區間的顏色
  const getScoreColor = range => {
    if (range === '1.0') return 'success';
    if (range.includes('0.8') || range.includes('0.9')) return 'info';
    if (range.includes('0.6') || range.includes('0.7')) return 'warning';
    return 'error';
  };

  if (!scoreAnchors || scoreAnchors.length === 0) {
    return null;
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={(e, isExpanded) => setExpanded(isExpanded)}
      sx={{
        mb: 2,
        '&:before': { display: 'none' },
        boxShadow: 1
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          bgcolor: 'action.hover',
          '&:hover': { bgcolor: 'action.selected' }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {t('evalTasks.scoreAnchorsTitle', '{{type}}評分規則', { type: getQuestionTypeName() })}
          </Typography>
          <Chip label={t('evalTasks.customizable', '可自定義')} size="small" color="primary" variant="outlined" />
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('evalTasks.scoreAnchorsHint', '自定義評分標準，用於指導LLM評估模型的回答品質')}
          </Typography>
          <Tooltip title={t('evalTasks.restoreDefault', '恢復預設')}>
            <IconButton size="small" onClick={handleRestore} color="primary">
              <RestoreIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {scoreAnchors.map((anchor, index) => (
          <Box key={index} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={anchor.range}
                size="small"
                color={getScoreColor(anchor.range)}
                sx={{ minWidth: 70, fontWeight: 600 }}
              />
              <Typography variant="caption" color="text.secondary">
                {t('evalTasks.scoreRange', '分數區間')}
              </Typography>
            </Box>
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              value={anchor.description}
              onChange={e => handleDescriptionChange(index, e.target.value)}
              placeholder={t('evalTasks.scoreDescriptionPlaceholder', '請輸入該分數區間的評分標準描述...')}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.875rem'
                }
              }}
            />
          </Box>
        ))}
      </AccordionDetails>
    </Accordion>
  );
}
