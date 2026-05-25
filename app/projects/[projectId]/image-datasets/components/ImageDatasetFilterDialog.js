'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Select,
  MenuItem,
  Slider,
  TextField,
  Button
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function ImageDatasetFilterDialog({
  open,
  onClose,
  statusFilter,
  scoreFilter,
  onStatusChange,
  onScoreChange,
  onResetFilters,
  onApplyFilters
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('datasets.filtersTitle', '篩選條件')}</DialogTitle>
      <DialogContent>
        {/* 確認狀態篩選 */}
        <Box sx={{ mb: 3, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            {t('imageDatasets.status', { defaultValue: '確認狀態' })}
          </Typography>
          <Select
            value={statusFilter}
            onChange={e => onStatusChange(e.target.value)}
            fullWidth
            size="small"
            sx={{ mt: 1 }}
          >
            <MenuItem value="all">{t('common.all', '全部')}</MenuItem>
            <MenuItem value="confirmed">{t('imageDatasets.confirmed', { defaultValue: '已確認' })}</MenuItem>
            <MenuItem value="unconfirmed">{t('imageDatasets.unconfirmed', { defaultValue: '未確認' })}</MenuItem>
          </Select>
        </Box>

        {/* 評分範圍篩選 */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
            {t('imageDatasets.scoreRange', { defaultValue: '評分範圍' })}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            {scoreFilter[0]} - {scoreFilter[1]} 分
          </Typography>
          <Slider
            value={scoreFilter}
            onChange={(e, newValue) => onScoreChange(newValue)}
            valueLabelDisplay="auto"
            min={0}
            max={5}
            step={1}
            marks
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>

      {/* 對話方塊操作按鈕 */}
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onResetFilters} variant="outlined">
          {t('common.reset', '重置')}
        </Button>
        <Button onClick={onClose} variant="outlined">
          {t('common.cancel', '取消')}
        </Button>
        <Button onClick={onApplyFilters} variant="contained">
          {t('common.apply', '應用')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
