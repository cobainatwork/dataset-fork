'use client';

import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import { useTranslation } from 'react-i18next';

// 任務操作元件
export default function TaskActions({ task, onAbort, onDelete }) {
  const { t } = useTranslation();

  // 處理中的任務顯示中斷按鈕，其他狀態顯示刪除按鈕
  return task.status === 0 ? (
    <Tooltip title={t('tasks.actions.abort')} arrow>
      <IconButton size="small" onClick={() => onAbort(task.id)}>
        <StopCircleIcon fontSize="small" color="warning" />
      </IconButton>
    </Tooltip>
  ) : (
    <Tooltip title={t('tasks.actions.delete')} arrow>
      <IconButton size="small" onClick={() => onDelete(task.id)}>
        <DeleteIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
