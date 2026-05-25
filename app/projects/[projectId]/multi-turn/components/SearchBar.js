'use client';

import { Box, Paper, Button, IconButton, InputBase, CircularProgress } from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * 搜尋欄元件
 * @param {string} searchKeyword - 搜尋關鍵詞
 * @param {function} onSearchChange - 搜尋關鍵詞變化回撥
 * @param {function} onSearch - 搜尋回撥
 * @param {function} onFilterClick - 篩選按鈕點選回撥
 * @param {function} onExportClick - 匯出按鈕點選回撥
 * @param {boolean} exportLoading - 匯出載入狀態
 * @param {number} selectedCount - 選中的專案數量
 * @param {function} onBatchDelete - 批次刪除回撥
 * @param {boolean} batchDeleteLoading - 批次刪除載入狀態
 */
const SearchBar = ({
  searchKeyword,
  onSearchChange,
  onSearch,
  onFilterClick,
  onExportClick,
  exportLoading = false,
  selectedCount = 0,
  onBatchDelete,
  batchDeleteLoading = false
}) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Paper
          component="form"
          sx={{
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            width: 400,
            borderRadius: 2
          }}
        >
          <IconButton sx={{ p: '10px' }} aria-label="search">
            <SearchIcon />
          </IconButton>
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder={t('datasets.searchPlaceholder')}
            value={searchKeyword}
            onChange={e => onSearchChange(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && onSearch()}
          />
        </Paper>
        <Button variant="outlined" startIcon={<FilterIcon />} onClick={onFilterClick} sx={{ borderRadius: 2 }}>
          {t('datasets.moreFilters')}
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        {selectedCount > 0 && (
          <Button
            variant="outlined"
            color="error"
            startIcon={batchDeleteLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
            onClick={onBatchDelete}
            disabled={batchDeleteLoading}
            sx={{ borderRadius: 2 }}
          >
            {batchDeleteLoading ? t('datasets.deleting') : `${t('datasets.batchDelete')} (${selectedCount})`}
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={exportLoading ? <CircularProgress size={16} /> : <DownloadIcon />}
          onClick={onExportClick}
          disabled={exportLoading}
          sx={{ borderRadius: 2 }}
        >
          {exportLoading ? t('datasets.exporting') : t('exportDialog.export')}
        </Button>
      </Box>
    </Box>
  );
};

export default SearchBar;
