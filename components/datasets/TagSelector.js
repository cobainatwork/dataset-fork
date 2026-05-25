'use client';

import { useState, useEffect } from 'react';
import { Box, Chip, TextField, Autocomplete, Typography, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

/**
 * 標籤選擇器元件
 * 支援從已有標籤選擇和自定義新增新標籤
 */
export default function TagSelector({
  value = [],
  onChange,
  availableTags = [],
  placeholder,
  readOnly = false,
  maxTags = 10
}) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');

  // 確保 value 始終是陣列
  const normalizeValue = val => {
    if (Array.isArray(val)) {
      return val;
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const [selectedTags, setSelectedTags] = useState(() => normalizeValue(value));

  // 同步外部value變化
  useEffect(() => {
    setSelectedTags(normalizeValue(value));
  }, [value]);

  // 處理標籤變更
  const handleTagsChange = newTags => {
    setSelectedTags(newTags);
    if (onChange) {
      onChange(newTags);
    }
  };

  // 新增新標籤
  const handleAddTag = newTag => {
    if (!newTag || newTag.trim() === '') return;

    const trimmedTag = newTag.trim();
    if (selectedTags.includes(trimmedTag)) return;

    if (selectedTags.length >= maxTags) {
      return;
    }

    const updatedTags = [...selectedTags, trimmedTag];
    handleTagsChange(updatedTags);
    setInputValue('');
  };

  // 刪除標籤
  const handleDeleteTag = tagToDelete => {
    const updatedTags = selectedTags.filter(tag => tag !== tagToDelete);
    handleTagsChange(updatedTags);
  };

  // 處理鍵盤事件
  const handleKeyPress = event => {
    if (event.key === 'Enter' && inputValue.trim()) {
      event.preventDefault();
      handleAddTag(inputValue);
    }
  };

  // 獲取可選的標籤選項（排除已選擇的）
  const getAvailableOptions = () => {
    return availableTags.filter(tag => !selectedTags.includes(tag));
  };

  if (readOnly) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {selectedTags.length > 0 ? (
          selectedTags.map((tag, index) => (
            <Chip key={index} label={tag} size="small" variant="outlined" color="primary" />
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('tags.noTags', '暫無標籤')}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* 已選擇的標籤 */}
      {selectedTags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {selectedTags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
              color="primary"
              onDelete={() => handleDeleteTag(tag)}
              deleteIcon={<CloseIcon />}
            />
          ))}
        </Box>
      )}

      {/* 標籤輸入區域 */}
      {selectedTags.length < maxTags && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <Autocomplete
            freeSolo
            options={getAvailableOptions()}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
              setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
              if (newValue) {
                handleAddTag(newValue);
              }
            }}
            renderInput={params => (
              <TextField
                {...params}
                size="small"
                placeholder={placeholder || t('tags.addTag', '新增標籤...')}
                onKeyPress={handleKeyPress}
                sx={{ minWidth: 200 }}
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Typography variant="body2">{option}</Typography>
              </Box>
            )}
            sx={{ flexGrow: 1 }}
          />

          <Tooltip title={t('tags.addCustomTag', '新增自定義標籤')}>
            <IconButton
              size="small"
              onClick={() => handleAddTag(inputValue)}
              disabled={!inputValue.trim()}
              color="primary"
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* 標籤數量提示 */}
      {selectedTags.length >= maxTags && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          {t('tags.maxTagsReached', `最多可新增 ${maxTags} 個標籤`)}
        </Typography>
      )}

      {/* 可用標籤提示 */}
      {availableTags.length > 0 && selectedTags.length < maxTags && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {t('tags.availableTagsHint', '可從已有標籤中選擇，或輸入新標籤')}
        </Typography>
      )}
    </Box>
  );
}
