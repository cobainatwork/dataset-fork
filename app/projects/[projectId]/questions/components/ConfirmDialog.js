'use client';

import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * 確認對話方塊元件
 * @param {Object} props
 * @param {boolean} props.open - 對話方塊是否開啟
 * @param {Function} props.onClose - 關閉對話方塊的回撥函式
 * @param {Function} props.onConfirm - 確認操作的回撥函式
 * @param {string} props.title - 對話方塊標題
 * @param {string} props.content - 對話方塊內容
 * @param {string} props.confirmText - 確認按鈕文字，預設為 "確認刪除"
 * @param {string} props.cancelText - 取消按鈕文字，預設為 "取消"
 * @param {string} props.confirmColor - 確認按鈕顏色，預設為 "error"
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  content,
  confirmText,
  cancelText,
  confirmColor = 'error'
}) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onClose();
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">{content}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {cancelText || t('common.cancel')}
        </Button>
        <Button onClick={handleConfirm} color={confirmColor} variant="contained" autoFocus>
          {confirmText || t('common.confirmDelete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
