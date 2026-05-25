'use client';

import { Box, Typography, Chip, Tooltip, alpha, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';

/**
 * 資料集元資料展示元件
 */
export default function DatasetMetadata({ currentDataset, onViewChunk }) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
        {t('datasets.metadata')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip label={`${t('datasets.model')}: ${currentDataset.model}`} variant="outlined" />
        {currentDataset.questionLabel && (
          <Chip label={`${t('common.label')}: ${currentDataset.questionLabel}`} color="primary" variant="outlined" />
        )}
        <Chip
          label={`${t('datasets.createdAt')}: ${new Date(currentDataset.createAt).toLocaleString('zh-CN')}`}
          variant="outlined"
        />
        <Tooltip title={t('textSplit.viewChunk')}>
          <Chip
            label={`${t('datasets.chunkId')}: ${currentDataset.chunkName}`}
            variant="outlined"
            color="info"
            onClick={async () => {
              try {
                // 使用新API介面獲取文字塊內容
                const response = await fetch(
                  `/api/projects/${currentDataset.projectId}/chunks/name?chunkName=${encodeURIComponent(currentDataset.chunkName)}`
                );

                if (!response.ok) {
                  throw new Error(`獲取文字塊失敗: ${response.statusText}`);
                }

                const chunkData = await response.json();

                // 呼叫父元件的方法顯示文字塊
                onViewChunk({
                  name: currentDataset.chunkName,
                  content: chunkData.content
                });
              } catch (error) {
                console.error('獲取文字塊內容失敗:', error);
                // 即使API請求失敗，也嘗試呼叫檢視方法
                onViewChunk({
                  name: currentDataset.chunkName,
                  content: '內容載入失敗，請重試'
                });
              }
            }}
            sx={{ cursor: 'pointer' }}
          />
        </Tooltip>
        {currentDataset.confirmed && (
          <Chip
            label={t('datasets.confirmed')}
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.dark,
              fontWeight: 'medium'
            }}
          />
        )}
      </Box>
    </Box>
  );
}
