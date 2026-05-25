'use client';

import { Dialog, DialogActions, DialogTitle, Button } from '@mui/material';

/**
 * 通用確認對話方塊元件
 * @param {Object} props
 * @param {boolean} props.open - 對話方塊是否開啟
 * @param {Function} props.onClose - 關閉對話方塊的回撥
 * @param {Function} props.onConfirm - 確認操作的回撥
 * @param {string} props.title - 對話方塊標題
 * @param {string} props.cancelText - 取消按鈕文字
 * @param {string} props.confirmText - 確認按鈕文字
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  cancelText = '取消',
  confirmText = '確認',
  confirmColor = 'error'
}) {
  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="confirm-dialog-title">
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          {cancelText}
        </Button>
        <Button onClick={onConfirm} color={confirmColor} autoFocus>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
