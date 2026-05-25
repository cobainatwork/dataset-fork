'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * 領域樹操作選擇對話方塊
 * 提供三種選項：修訂領域樹、重建領域樹、不更改領域樹
 */
export default function DomainTreeActionDialog({ open, onClose, onConfirm, isFirstUpload, action }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(isFirstUpload ? 'rebuild' : 'revise');

  // 處理選項變更
  const handleChange = event => {
    setValue(event.target.value);
  };

  // 確認選擇
  const handleConfirm = () => {
    onConfirm(value);
  };

  // 獲取對話方塊標題
  const getDialogTitle = () => {
    if (isFirstUpload) {
      return t('textSplit.domainTree.firstUploadTitle');
    }
    return action === 'upload' ? t('textSplit.domainTree.uploadTitle') : t('textSplit.domainTree.deleteTitle');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{getDialogTitle()}</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset">
          <RadioGroup value={value} onChange={handleChange}>
            {!isFirstUpload && (
              <FormControlLabel
                value="revise"
                control={<Radio />}
                label={
                  <>
                    <Typography variant="subtitle1">{t('textSplit.domainTree.reviseOption')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('textSplit.domainTree.reviseDesc')}
                    </Typography>
                  </>
                }
              />
            )}
            <FormControlLabel
              value="rebuild"
              control={<Radio />}
              label={
                <>
                  <Typography variant="subtitle1">{t('textSplit.domainTree.rebuildOption')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('textSplit.domainTree.rebuildDesc')}
                  </Typography>
                </>
              }
            />
            {!isFirstUpload && (
              <FormControlLabel
                value="keep"
                control={<Radio />}
                label={
                  <>
                    <Typography variant="subtitle1">{t('textSplit.domainTree.keepOption')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('textSplit.domainTree.keepDesc')}
                    </Typography>
                  </>
                }
              />
            )}
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          {t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
