'use client';

import { Box, Typography, Chip, alpha, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';

/**
 * 元資料資訊展示元件 - Chip 形式（參考 DatasetMetadata）
 */
export default function MetadataInfo({ dataset }) {
  const { t } = useTranslation();
  const theme = useTheme();

  // 解析標籤
  const parsedTags = (() => {
    try {
      if (typeof dataset.tags === 'string' && dataset.tags) {
        return JSON.parse(dataset.tags);
      }
      return Array.isArray(dataset.tags) ? dataset.tags : [];
    } catch {
      return [];
    }
  })();

  // 格式化檔案大小
  const formatFileSize = bytes => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* 資料集資訊 */}
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
        {t('common.detailInfo', '詳細資訊')}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        {/* 使用模型 */}
        {dataset.model && (
          <Chip
            label={`${t('imageDatasets.modelInfo', '使用模型')}: ${dataset.model}`}
            variant="outlined"
            size="small"
          />
        )}

        {/* 標籤數量 */}
        {parsedTags.length > 0 && (
          <Chip
            label={`${t('imageDatasets.tags', '標籤')}: ${parsedTags.length} ${t('common.items', '項')}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        )}

        {/* 建立時間 */}
        <Chip
          label={`${t('imageDatasets.createdAt', '建立時間')}: ${new Date(dataset.createAt).toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          })}`}
          variant="outlined"
          size="small"
        />

        {/* 文字塊資訊 */}
        {dataset.questionTemplate?.description && (
          <Chip
            label={`${t('imageDatasets.description', '描述')}: ${dataset.questionTemplate.description}`}
            variant="outlined"
            size="small"
            sx={{ maxWidth: '100%' }}
          />
        )}

        {/* 確認狀態 */}
        {dataset.confirmed && (
          <Chip
            label={t('datasets.confirmed', '已確認')}
            size="small"
            sx={{
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              color: theme.palette.success.dark,
              fontWeight: 'medium'
            }}
          />
        )}
      </Box>

      {/* 圖片資訊 */}
      {dataset.image && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
            {t('images.imageInfo', '圖片資訊')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {/* 圖片尺寸 */}
            {dataset.image.width && dataset.image.height && (
              <Chip
                label={`${t('images.resolution', '解析度')}: ${dataset.image.width}×${dataset.image.height}`}
                variant="outlined"
                size="small"
              />
            )}

            {/* 檔案大小 */}
            {dataset.image.size && (
              <Chip
                label={`${t('images.fileSize', '檔案大小')}: ${formatFileSize(dataset.image.size)}`}
                variant="outlined"
                size="small"
              />
            )}

            {/* 圖片建立時間 */}
            {dataset.image.createAt && (
              <Chip
                label={`${t('images.uploadTime', '上傳時間')}: ${new Date(dataset.image.createAt).toLocaleString(
                  'zh-CN',
                  {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }
                )}`}
                variant="outlined"
                size="small"
              />
            )}

            {/* 圖片名稱 */}
            {dataset.image.imageName && (
              <Chip
                label={`${t('images.fileName', '檔名')}: ${dataset.image.imageName}`}
                variant="outlined"
                size="small"
                sx={{ maxWidth: '100%' }}
              />
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
