'use client';

import { useState, useEffect } from 'react';
import { Box, TextField, Typography, IconButton, Tooltip, Collapse } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import NotesIcon from '@mui/icons-material/Notes';
import { useTranslation } from 'react-i18next';

/**
 * 備註輸入元件
 */
export default function NoteInput({
  value = '',
  onChange,
  placeholder,
  readOnly = false,
  maxLength = 500,
  minRows = 3,
  maxRows = 6
}) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [noteValue, setNoteValue] = useState(value);
  const [tempValue, setTempValue] = useState(value);

  // 同步外部value變化
  useEffect(() => {
    setNoteValue(value);
    setTempValue(value);
  }, [value]);

  // 開始編輯
  const handleStartEdit = () => {
    setIsEditing(true);
    setTempValue(noteValue);
  };

  // 儲存備註
  const handleSave = () => {
    setNoteValue(tempValue);
    setIsEditing(false);
    if (onChange) {
      onChange(tempValue);
    }
  };

  // 取消編輯
  const handleCancel = () => {
    setTempValue(noteValue);
    setIsEditing(false);
  };

  // 處理鍵盤快捷鍵
  const handleKeyDown = event => {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleSave();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    }
  };

  if (readOnly) {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <NotesIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            {t('datasets.note', '備註')}
          </Typography>
        </Box>
        {noteValue ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', pl: 3 }}>
            {noteValue}
          </Typography>
        ) : (
          <Typography variant="body2" color="text.disabled" sx={{ pl: 3 }}>
            {t('datasets.noNote', '暫無備註')}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* 標題和操作按鈕 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotesIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" color="text.secondary">
            {t('datasets.note', '備註')}
          </Typography>
          {noteValue && !isEditing && (
            <Typography variant="caption" color="text.disabled">
              ({noteValue.length} / {maxLength})
            </Typography>
          )}
        </Box>

        {!isEditing && (
          <Tooltip title={t('common.edit', '編輯')}>
            <IconButton size="small" onClick={handleStartEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* 顯示模式 */}
      <Collapse in={!isEditing}>
        <Box sx={{ pl: 3, mb: 2 }}>
          {noteValue ? (
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover'
                },
                p: 1,
                borderRadius: 1
              }}
              onClick={handleStartEdit}
            >
              {noteValue}
            </Typography>
          ) : (
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover'
                },
                p: 1,
                borderRadius: 1
              }}
              onClick={handleStartEdit}
            >
              {placeholder || t('datasets.clickToAddNote', '點選新增備註...')}
            </Typography>
          )}
        </Box>
      </Collapse>

      {/* 編輯模式 */}
      <Collapse in={isEditing}>
        <Box sx={{ pl: 3 }}>
          <TextField
            fullWidth
            multiline
            minRows={minRows}
            maxRows={maxRows}
            value={tempValue}
            onChange={e => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('datasets.enterNote', '請輸入備註...')}
            inputProps={{ maxLength }}
            helperText={
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {t('datasets.noteShortcuts', 'Ctrl+Enter 儲存，Esc 取消')}
                </Typography>
                <Typography
                  variant="caption"
                  color={tempValue.length > maxLength * 0.9 ? 'warning.main' : 'text.secondary'}
                >
                  {tempValue.length} / {maxLength}
                </Typography>
              </Box>
            }
            sx={{ mb: 1 }}
          />

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Tooltip title={t('common.cancel', '取消')}>
              <IconButton size="small" onClick={handleCancel}>
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.save', '儲存')}>
              <IconButton size="small" onClick={handleSave} color="primary" disabled={tempValue.length > maxLength}>
                <SaveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
