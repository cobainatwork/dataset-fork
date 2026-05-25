'use client';

import {
  Box,
  IconButton,
  ToggleButton,
  Tooltip,
  Divider,
  Autocomplete,
  TextField,
  Menu,
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import DeleteIcon from '@mui/icons-material/DeleteOutline'; // 使用 Outline 版本更精緻
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline'; // 統一使用 Outline 風格圖示
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckBoxIcon from '@mui/icons-material/CheckBoxOutlineBlank'; // 或者 CheckBox
import ShortTextIcon from '@mui/icons-material/ShortText';
import NotesIcon from '@mui/icons-material/Notes';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import StorageIcon from '@mui/icons-material/Storage';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useTranslation } from 'react-i18next';
import { useTheme, alpha } from '@mui/material/styles';
import { useState } from 'react';

import {
  ToolbarContainer,
  FilterGroup,
  FilterButton,
  SearchWrapper,
  StyledInputBase,
  ActionGroup,
  ActionButton,
  DeleteActionButton,
  StyledToggleButtonGroup
} from './EvalToolbar.styles';

const STATS_CONFIG = [
  { key: 'true_false', icon: CheckCircleIcon, color: 'success' },
  { key: 'single_choice', icon: RadioButtonCheckedIcon, color: 'primary' },
  { key: 'multiple_choice', icon: CheckBoxIcon, color: 'secondary' },
  { key: 'short_answer', icon: ShortTextIcon, color: 'warning' },
  { key: 'open_ended', icon: NotesIcon, color: 'info' }
];

export default function EvalToolbar({
  keyword,
  onKeywordChange,
  viewMode,
  onViewModeChange,
  selectedCount,
  onDeleteSelected,
  stats,
  questionType,
  onTypeChange,
  tags,
  onTagsChange,
  onImport,
  onBuiltinImport,
  onExport
}) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [importAnchorEl, setImportAnchorEl] = useState(null);

  const handleImportClick = event => {
    setImportAnchorEl(event.currentTarget);
  };

  const handleImportClose = () => {
    setImportAnchorEl(null);
  };

  const handleCustomImport = () => {
    handleImportClose();
    onImport?.();
  };

  const handleBuiltinImport = () => {
    handleImportClose();
    onBuiltinImport?.();
  };

  const tagOptions = stats?.byTag
    ? Object.keys(stats.byTag).map(tag => ({
        label: tag,
        count: stats.byTag[tag]
      }))
    : [];

  return (
    <ToolbarContainer elevation={0} variant="outlined">
      {/* 頂部：題型統計篩選 */}
      <FilterGroup>
        {stats &&
          STATS_CONFIG.map(({ key, icon: Icon, color }) => {
            const count = stats.byType?.[key] || 0;
            const isActive = questionType === key;

            return (
              <FilterButton
                key={key}
                startIcon={<Icon sx={{ fontSize: 18 }} />}
                active={isActive}
                colorType={color}
                onClick={() => onTypeChange(isActive ? '' : key)}
              >
                {t(`eval.questionTypes.${key}`)}
                <Box component="span" sx={{ ml: 0.8, opacity: 0.9, fontSize: '0.8em' }}>
                  ({count})
                </Box>
              </FilterButton>
            );
          })}
      </FilterGroup>

      <Divider sx={{ opacity: 0.6 }} />

      {/* 底部：篩選和操作 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap'
        }}
      >
        {/* 左側：篩選器組 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 300 }}>
          {/* 搜尋框 */}
          <SearchWrapper>
            <IconButton sx={{ p: '8px' }} aria-label="search" disabled>
              <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            </IconButton>
            <StyledInputBase
              placeholder={t('eval.searchPlaceholder', '搜尋題目內容...')}
              value={keyword}
              onChange={e => onKeywordChange(e.target.value)}
            />
          </SearchWrapper>

          {/* 標籤篩選 */}
          <Autocomplete
            multiple
            size="small"
            options={tagOptions}
            getOptionLabel={option => `${option.label} (${option.count})`}
            value={tagOptions.filter(o => tags.includes(o.label))}
            onChange={(e, newValue) => onTagsChange(newValue.map(v => v.label))}
            renderInput={params => (
              <TextField
                {...params}
                placeholder={tags.length === 0 ? t('eval.tags', '標籤') : ''}
                size="small"
                sx={{
                  width: 280,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                    backgroundColor: 'background.paper',
                    minHeight: 42,
                    fieldset: {
                      borderColor: theme.palette.divider
                    },
                    '&:hover fieldset': {
                      borderColor: theme.palette.text.secondary
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                      borderWidth: 1,
                      boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`
                    }
                  }
                }}
              />
            )}
            sx={{
              '& .MuiAutocomplete-tag': {
                height: 24,
                borderRadius: 1
              }
            }}
          />
        </Box>

        {/* 右側：操作按鈕組 */}
        <ActionGroup>
          {/* 匯入按鈕下拉選單 */}
          <ActionButton
            variant="outlined"
            startIcon={<UploadFileIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            onClick={handleImportClick}
          >
            {t('common.import', '匯入')}
          </ActionButton>
          <Menu
            anchorEl={importAnchorEl}
            open={Boolean(importAnchorEl)}
            onClose={handleImportClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
          >
            <MenuItem onClick={handleCustomImport} disableRipple>
              <UploadFileIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
              {t('evalDatasets.import.custom', '匯入自定義資料集')}
            </MenuItem>
            <MenuItem onClick={handleBuiltinImport} disableRipple>
              <StorageIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
              {t('evalDatasets.import.builtin', '匯入內建資料集')}
            </MenuItem>
          </Menu>

          {/* 匯出按鈕 */}
          <ActionButton variant="outlined" startIcon={<FileDownloadIcon />} onClick={onExport}>
            {t('common.export', '匯出')}
          </ActionButton>

          {selectedCount > 0 && (
            <DeleteActionButton variant="soft" startIcon={<DeleteIcon />} onClick={onDeleteSelected}>
              {t('eval.deleteSelectedCount', `刪除選中 (${selectedCount})`, { count: selectedCount })}
            </DeleteActionButton>
          )}

          <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', mx: 0.5 }} />

          <StyledToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, value) => value && onViewModeChange(value)}
            size="small"
          >
            <ToggleButton value="card" aria-label="card view">
              <Tooltip title={t('eval.cardView', '卡片檢視')}>
                <ViewModuleIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <Tooltip title={t('eval.listView', '列表檢視')}>
                <ViewListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </StyledToggleButtonGroup>
        </ActionGroup>
      </Box>
    </ToolbarContainer>
  );
}
