'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function ChunkBatchDeleteDialog({ open, onClose, onConfirm, loading, count }) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      aria-labelledby="batch-delete-dialog-title"
      aria-describedby="batch-delete-dialog-description"
    >
      <DialogTitle id="batch-delete-dialog-title">
        {t('textSplit.batchDeleteChunksConfirmTitle', { defaultValue: '確認批次刪除' })}
      </DialogTitle>
      <DialogContent>
        <DialogContentText id="batch-delete-dialog-description">
          {t('textSplit.batchDeleteChunksConfirmMessage', {
            count,
            defaultValue: `您確定要刪除選中的 ${count} 個文字塊嗎？此操作不可恢復。`
          })}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
