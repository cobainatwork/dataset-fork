'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  TextField,
  Box,
  Typography,
  Alert
} from '@mui/material';

const ExportImageDatasetDialog = ({ open, onClose, onExport }) => {
  const { t } = useTranslation();
  const [formatType, setFormatType] = useState('raw');
  const [exportImages, setExportImages] = useState(false);
  const [includeImagePath, setIncludeImagePath] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [confirmedOnly, setConfirmedOnly] = useState(false);

  const handleExport = () => {
    onExport({
      formatType,
      exportImages,
      includeImagePath,
      systemPrompt,
      confirmedOnly
    });
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>{t('imageDatasets.exportTitle', '匯出圖片資料集')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          {/* 匯出格式選擇 */}
          <FormControl component="fieldset">
            <FormLabel component="legend">{t('imageDatasets.exportFormat', '匯出格式')}</FormLabel>
            <RadioGroup value={formatType} onChange={e => setFormatType(e.target.value)}>
              <FormControlLabel value="raw" control={<Radio />} label={t('imageDatasets.rawFormat', '原始格式')} />
              <FormControlLabel value="sharegpt" control={<Radio />} label="ShareGPT (OpenAI)" />
              <FormControlLabel value="alpaca" control={<Radio />} label="Alpaca" />
            </RadioGroup>
          </FormControl>

          {/* 圖片匯出選項 */}
          <Box>
            <FormControlLabel
              control={<Checkbox checked={exportImages} onChange={e => setExportImages(e.target.checked)} />}
              label={t('imageDatasets.exportImagesOption', '匯出圖片檔案')}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              {t('imageDatasets.exportImagesDesc', '將所有圖片打包成 ZIP 壓縮包一起下載')}
            </Typography>
          </Box>

          {/* 圖片路徑選項 */}
          <Box>
            <FormControlLabel
              control={<Checkbox checked={includeImagePath} onChange={e => setIncludeImagePath(e.target.checked)} />}
              label={t('imageDatasets.includeImagePath', '在資料集中包含圖片路徑')}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4 }}>
              {t('imageDatasets.includeImagePathDesc', '在問題或答案中新增圖片路徑（格式：/images/圖片名稱）')}
            </Typography>
          </Box>

          {/* 系統提示詞 */}
          <TextField
            label={t('imageDatasets.systemPrompt', '系統提示詞（可選）')}
            multiline
            rows={3}
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            placeholder={t('imageDatasets.systemPromptPlaceholder', '輸入系統提示詞...')}
            fullWidth
          />

          {/* 僅匯出已確認 */}
          <FormControlLabel
            control={<Checkbox checked={confirmedOnly} onChange={e => setConfirmedOnly(e.target.checked)} />}
            label={t('imageDatasets.confirmedOnly', '僅匯出已確認的資料集')}
          />

          {/* 提示資訊 */}
          <Alert severity="info" sx={{ mt: 1 }}>
            {t('imageDatasets.exportTip', '標籤格式的答案將自動解析為文字（逗號分隔）')}
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined">
          {t('common.cancel', '取消')}
        </Button>
        <Button onClick={handleExport} variant="contained">
          {t('export.title', '匯出')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportImageDatasetDialog;
