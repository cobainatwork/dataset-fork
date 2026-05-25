'use client';

import { Card, CardMedia, Box, Chip, Typography, Tooltip, IconButton } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useTranslation } from 'react-i18next';
import { imageDatasetStyles } from '../styles/imageDatasetStyles';

export default function ImageDatasetCard({
  dataset,
  onClick,
  onView = () => {},
  onDelete = () => {},
  onEvaluate = () => {}
}) {
  const { t } = useTranslation();

  const getAnswerText = () => {
    if (!dataset.answer) return t('imageDatasets.noAnswer', '暫無答案');
    if (dataset.answerType === 'label') {
      try {
        const labels = JSON.parse(dataset.answer);
        return `${t('imageDatasets.labels', '標籤')}: ${labels.join(', ')}`;
      } catch {
        return dataset.answer;
      }
    }
    return dataset.answer;
  };

  const getAnswerTypeLabel = type => {
    switch (type) {
      case 'label':
        return t('imageDatasets.typeLabel', '標籤');
      case 'custom_format':
        return t('imageDatasets.typeCustom', '自定義');
      default:
        return t('imageDatasets.typeText', '文字');
    }
  };

  const getAnswerTypeColor = type => {
    switch (type) {
      case 'label':
        return 'secondary';
      case 'custom_format':
        return 'info';
      default:
        return 'primary';
    }
  };

  const getScoreLabel = () => {
    if (!dataset.score || dataset.score === 0) {
      return t('imageDatasets.unscored', '未評分');
    }
    return dataset.score;
  };

  return (
    <Card sx={imageDatasetStyles.datasetCard}>
      {/* 圖片區域 */}
      <Box sx={imageDatasetStyles.imageWrapper}>
        <CardMedia
          component="img"
          image={dataset.base64 || '/placeholder.png'}
          alt={dataset.imageName}
          sx={imageDatasetStyles.imageMedia}
        />

        {/* 懸停遮罩 */}
        <Box sx={imageDatasetStyles.imageOverlay} />

        {/* 問題內容 - 底部，毛玻璃背景 */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 1.5,
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 70%, transparent 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: '#fff',
              fontWeight: 500,
              lineHeight: 1.4,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textAlign: 'center'
            }}
          >
            {dataset.question}
          </Typography>
        </Box>
      </Box>

      {/* 內容區域 - 標籤和操作按鈕 */}
      <Tooltip title={getAnswerText()} placement="top" arrow>
        <Box sx={{ p: 1.5, cursor: 'help' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
            {/* 左側：所有標籤 */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={getAnswerTypeLabel(dataset.answerType)}
                size="small"
                color={getAnswerTypeColor(dataset.answerType)}
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
              <Chip
                label={
                  dataset.confirmed ? t('imageDatasets.confirmed', '已確認') : t('imageDatasets.unconfirmed', '未確認')
                }
                size="small"
                color={dataset.confirmed ? 'success' : 'default'}
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
              <Chip
                icon={<span style={{ fontSize: '0.7rem' }}>⭐</span>}
                label={getScoreLabel()}
                size="small"
                color={dataset.score && dataset.score > 0 ? 'warning' : 'default'}
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>

            {/* 右側：操作按鈕 - 不同顏色 */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={t('imageDatasets.view', '檢視詳情')} placement="top">
                <IconButton
                  size="small"
                  onClick={e => {
                    e.stopPropagation();
                    onView(dataset.id);
                  }}
                  sx={{
                    p: 0.5,
                    borderRadius: 1,
                    color: '#1976d2',
                    '&:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.1)'
                    }
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('imageDatasets.evaluate', '品質評估')} placement="top">
                <IconButton
                  size="small"
                  onClick={e => {
                    e.stopPropagation();
                    onEvaluate(dataset.id);
                  }}
                  sx={{
                    p: 0.5,
                    borderRadius: 1,
                    color: '#f57c00',
                    '&:hover': {
                      backgroundColor: 'rgba(245, 124, 0, 0.1)'
                    }
                  }}
                >
                  <AssessmentIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title={t('imageDatasets.delete', '刪除')} placement="top">
                <IconButton
                  size="small"
                  onClick={e => {
                    e.stopPropagation();
                    onDelete(dataset.id);
                  }}
                  sx={{
                    p: 0.5,
                    borderRadius: 1,
                    color: '#d32f2f',
                    '&:hover': {
                      backgroundColor: 'rgba(211, 47, 47, 0.1)'
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Tooltip>
    </Card>
  );
}
