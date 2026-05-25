'use client';

import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useTranslation } from 'react-i18next';

/**
 * 標籤操作選單元件
 * @param {Object} props
 * @param {HTMLElement} props.anchorEl - 選單錨點元素
 * @param {boolean} props.open - 選單是否開啟
 * @param {Function} props.onClose - 關閉選單的回撥
 * @param {Function} props.onEdit - 編輯操作的回撥
 * @param {Function} props.onDelete - 刪除操作的回撥
 */
export default function TagMenu({ anchorEl, open, onClose, onEdit, onDelete }) {
  const { t } = useTranslation();

  const handleEdit = () => {
    onEdit?.();
    onClose();
  };

  const handleDelete = () => {
    onDelete?.();
    onClose();
  };

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <MenuItem onClick={handleEdit}>
        <ListItemIcon>
          <EditIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('common.edit')}</ListItemText>
      </MenuItem>
      <MenuItem onClick={handleDelete}>
        <ListItemIcon>
          <DeleteIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>{t('common.delete')}</ListItemText>
      </MenuItem>
    </Menu>
  );
}
