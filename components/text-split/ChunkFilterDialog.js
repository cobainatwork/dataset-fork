'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Typography,
  Slider,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function ChunkFilterDialog({ open, onClose, onApply, initialFilters = {} }) {
  const { t } = useTranslation();
  const [contentKeyword, setContentKeyword] = useState(initialFilters.contentKeyword || '');
  const [sizeRange, setSizeRange] = useState(initialFilters.sizeRange || [0, 10000]);
  const [hasQuestions, setHasQuestions] = useState(initialFilters.hasQuestions || null);

  // 重置篩選條件
  const handleReset = () => {
    setContentKeyword('');
    setSizeRange([0, 10000]);
    setHasQuestions(null);
  };

  // 應用篩選
  const handleApply = () => {
    onApply({
      contentKeyword,
      sizeRange,
      hasQuestions
    });
    onClose();
  };

  // 處理大小範圍變化
  const handleSizeRangeChange = (event, newValue) => {
    setSizeRange(newValue);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('datasets.moreFilters', { defaultValue: '更多篩選' })}</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 3 }}>
        {/* 文字塊內容篩選 */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {t('textSplit.contentKeyword', { defaultValue: '文字塊內容' })}
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder={t('textSplit.contentKeywordPlaceholder', { defaultValue: '輸入關鍵詞搜尋文字塊內容' })}
            value={contentKeyword}
            onChange={e => setContentKeyword(e.target.value)}
            variant="outlined"
          />
        </Box>

        {/* 字數範圍篩選 */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {t('textSplit.characterRange', { defaultValue: '字數範圍' })}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {sizeRange[0]} - {sizeRange[1]}
            </Typography>
          </Box>
          <Slider
            value={sizeRange}
            onChange={handleSizeRangeChange}
            valueLabelDisplay="auto"
            min={0}
            max={10000}
            step={100}
            marks={[
              { value: 0, label: '0' },
              { value: 10000, label: '10000' }
            ]}
          />
        </Box>

        {/* 是否有問題的篩選 */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {t('textSplit.questionStatus', { defaultValue: '問題狀態' })}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={hasQuestions === null} onChange={() => setHasQuestions(null)} />}
              label={t('textSplit.allChunks', { defaultValue: '全部' })}
            />
            <FormControlLabel
              control={<Checkbox checked={hasQuestions === true} onChange={() => setHasQuestions(true)} />}
              label={t('textSplit.generatedQuestions2', { defaultValue: '已生成問題' })}
            />
            <FormControlLabel
              control={<Checkbox checked={hasQuestions === false} onChange={() => setHasQuestions(false)} />}
              label={t('textSplit.ungeneratedQuestions', { defaultValue: '未生成問題' })}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleReset} color="inherit">
          {t('common.reset', { defaultValue: '重置' })}
        </Button>
        <Button onClick={onClose} color="inherit">
          {t('common.cancel', { defaultValue: '取消' })}
        </Button>
        <Button onClick={handleApply} variant="contained" color="primary">
          {t('common.apply', { defaultValue: '應用' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
