'use client';

import { Box, Typography } from '@mui/material';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import { useTranslation } from 'react-i18next';
import { imageDatasetStyles } from '../styles/imageDatasetStyles';

export default function EmptyState() {
  const { t } = useTranslation();

  return (
    <Box sx={imageDatasetStyles.emptyState}>
      <Box sx={imageDatasetStyles.emptyIcon}>
        <ImageSearchIcon sx={{ fontSize: 60, color: 'primary.main' }} />
      </Box>
      <Typography variant="h5" sx={imageDatasetStyles.emptyTitle}>
        {t('imageDatasets.noData', { defaultValue: '暫無圖片資料集' })}
      </Typography>
      <Typography variant="body2" sx={imageDatasetStyles.emptyDescription}>
        {t('imageDatasets.noDataTip', { defaultValue: '請先在圖片管理中生成問答資料集' })}
      </Typography>
    </Box>
  );
}
