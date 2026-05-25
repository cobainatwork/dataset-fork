'use client';

import { useState } from 'react';
import {
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ChatIcon from '@mui/icons-material/Chat';
import { useTranslation } from 'react-i18next';

/**
 * 問題列表項元件
 * @param {Object} props
 * @param {Object} props.question - 問題物件
 * @param {number} props.level - 縮排級別
 * @param {Function} props.onDelete - 刪除問題的回撥
 * @param {Function} props.onGenerateDataset - 生成資料集的回撥
 * @param {Function} props.onGenerateMultiTurnDataset - 生成多輪對話資料集的回撥
 * @param {boolean} props.processing - 是否正在處理
 * @param {boolean} props.processingMultiTurn - 是否正在生成多輪對話
 */
export default function QuestionListItem({
  question,
  level,
  onDelete,
  onGenerateDataset,
  onGenerateMultiTurnDataset,
  processing = false,
  processingMultiTurn = false
}) {
  const { t } = useTranslation();

  return (
    <ListItem
      sx={{
        pl: (level + 1) * 2,
        py: 0.75,
        borderLeft: '1px dashed rgba(0, 0, 0, 0.1)',
        ml: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:hover': {
          bgcolor: 'action.hover'
        }
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Tooltip title={t('datasets.generateDataset')}>
            <IconButton
              size="small"
              color="primary"
              onClick={e => onGenerateDataset(e)}
              disabled={processing || processingMultiTurn}
            >
              {processing ? <CircularProgress size={16} /> : <AutoFixHighIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('questions.generateMultiTurnDataset', { defaultValue: '生成多輪對話資料集' })}>
            <IconButton
              size="small"
              color="secondary"
              onClick={e => onGenerateMultiTurnDataset && onGenerateMultiTurnDataset(e)}
              disabled={processing || processingMultiTurn || !onGenerateMultiTurnDataset}
            >
              {processingMultiTurn ? <CircularProgress size={16} /> : <ChatIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton
              size="small"
              color="error"
              onClick={e => onDelete(e)}
              disabled={processing || processingMultiTurn}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <ListItemIcon sx={{ minWidth: 32, color: 'secondary.main' }}>
        <HelpOutlineIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                paddingRight: '28px' // 留出刪除按鈕的空間
              }}
            >
              {question.question}
            </Typography>
            {question.answered && (
              <Chip
                size="small"
                label={t('datasets.answered')}
                color="success"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        }
      />
    </ListItem>
  );
}
