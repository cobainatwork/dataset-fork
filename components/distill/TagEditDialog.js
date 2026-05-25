'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * 標籤編輯對話方塊元件
 * @param {Object} props
 * @param {boolean} props.open - 對話方塊是否開啟
 * @param {Object} props.tag - 要編輯的標籤物件
 * @param {string} props.projectId - 專案ID
 * @param {Function} props.onClose - 關閉對話方塊的回撥
 * @param {Function} props.onSuccess - 編輯成功的回撥
 */
export default function TagEditDialog({ open, tag, projectId, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && tag) {
      setNewLabel(tag.label);
      setError('');
    }
  }, [open, tag]);

  const handleConfirm = async () => {
    if (!newLabel.trim()) {
      setError(t('distill.labelRequired'));
      return;
    }

    if (newLabel === tag.label) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.put(`/api/projects/${projectId}/distill/tags/${tag.id}`, { label: newLabel.trim() });

      if (response.status === 200) {
        toast.success(t('distill.tagUpdateSuccess'));
        onSuccess?.(response.data);
        onClose();
      }
    } catch (err) {
      console.error('更新標籤失敗:', err);
      setError(err.response?.data?.error || t('distill.tagUpdateFailed'));
      toast.error(err.response?.data?.error || t('distill.tagUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('distill.editTagTitle')}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label={t('distill.tagName')}
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          disabled={loading}
          autoFocus
          onKeyPress={e => {
            if (e.key === 'Enter' && !loading) {
              handleConfirm();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading || !newLabel.trim()}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
