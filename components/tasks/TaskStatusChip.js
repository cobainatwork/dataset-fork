'use client';

import React from 'react';
import { Chip, CircularProgress, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

// 任務狀態顯示元件
export default function TaskStatusChip({ status }) {
  const { t } = useTranslation();

  // 狀態對映配置
  const STATUS_CONFIG = {
    0: {
      label: t('tasks.status.processing'),
      color: 'warning',
      loading: true
    },
    1: {
      label: t('tasks.status.completed'),
      color: 'success'
    },
    2: {
      label: t('tasks.status.failed'),
      color: 'error'
    },
    3: {
      label: t('tasks.status.aborted'),
      color: 'default'
    }
  };

  const statusInfo = STATUS_CONFIG[status] || {
    label: t('tasks.status.unknown'),
    color: 'default'
  };

  // 處理中狀態顯示載入動畫
  if (status === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={16} color="warning" />
        <Chip label={statusInfo.label} color={statusInfo.color} size="small" />
      </Box>
    );
  }

  return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />;
}
