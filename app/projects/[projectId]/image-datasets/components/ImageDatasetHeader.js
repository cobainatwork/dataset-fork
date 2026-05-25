'use client';

import { Box, Button, Divider, Typography, IconButton, CircularProgress, Paper } from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

/**
 * 圖片資料集詳情頁面的頭部導航元件
 */
export default function ImageDatasetHeader({
  projectId,
  datasetsAllCount,
  datasetsConfirmCount,
  confirming,
  unconfirming,
  currentDataset,
  onNavigate,
  onConfirm,
  onUnconfirm,
  onDelete
}) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* 左側：返回按鈕和統計資訊 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<NavigateBeforeIcon />}
            onClick={() => router.push(`/projects/${projectId}/image-datasets`)}
          >
            {t('imageDatasets.title', '圖片資料集')}
          </Button>
          <Divider orientation="vertical" flexItem />
          <Typography variant="body2" color="text.secondary">
            共 {datasetsAllCount} 個數據集，已確認 {datasetsConfirmCount} 個 (
            {datasetsAllCount > 0 ? ((datasetsConfirmCount / datasetsAllCount) * 100).toFixed(2) : 0}%)
          </Typography>
        </Box>

        {/* 右側：翻頁、確認/取消確認、刪除按鈕 */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => onNavigate('prev')}>
            <NavigateBeforeIcon />
          </IconButton>
          <IconButton onClick={() => onNavigate('next')}>
            <NavigateNextIcon />
          </IconButton>
          <Divider orientation="vertical" flexItem />

          {/* 確認/取消確認按鈕 */}
          {currentDataset?.confirmed ? (
            <Button
              variant="outlined"
              color="warning"
              disabled={unconfirming}
              onClick={onUnconfirm}
              startIcon={unconfirming ? <CircularProgress size={16} /> : <UndoIcon />}
              sx={{ mr: 1 }}
            >
              {unconfirming ? t('common.unconfirming', '取消中...') : t('datasets.unconfirm', '取消確認')}
            </Button>
          ) : (
            <Button variant="contained" color="primary" disabled={confirming} onClick={onConfirm} sx={{ mr: 1 }}>
              {confirming ? <CircularProgress size={24} /> : t('datasets.confirmSave', '確認保留')}
            </Button>
          )}

          <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={onDelete}>
            {t('common.delete', '刪除')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
