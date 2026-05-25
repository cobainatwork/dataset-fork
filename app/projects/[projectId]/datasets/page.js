'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Box, Typography, Button, Card, useTheme, alpha } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useRouter } from 'next/navigation';
import ExportDatasetDialog from '@/components/ExportDatasetDialog';
import ExportProgressDialog from '@/components/ExportProgressDialog';
import ImportDatasetDialog from '@/components/datasets/ImportDatasetDialog';
import { useTranslation } from 'react-i18next';
import DatasetList from './components/DatasetList';
import SearchBar from './components/SearchBar';
import ActionBar from './components/ActionBar';
import FilterDialog from './components/FilterDialog';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import useDatasetExport from './hooks/useDatasetExport';
import useDatasetEvaluation from './hooks/useDatasetEvaluation';
import useDatasetFilters from './hooks/useDatasetFilters';
import { processInParallel } from '@/lib/util/async';
import axios from 'axios';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

// 主頁面元件
export default function DatasetsPage({ params }) {
  const { projectId } = params;
  const router = useRouter();
  const theme = useTheme();
  const [datasets, setDatasets] = useState({ data: [], total: 0, confirmedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    datasets: null,
    batch: false,
    deleting: false
  });
  const [exportDialog, setExportDialog] = useState({ open: false });
  const [importDialog, setImportDialog] = useState({ open: false });
  const [selectedIds, setselectedIds] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const { t } = useTranslation();

  // 使用 useDatasetFilters Hook 管理篩選條件
  const {
    filterConfirmed,
    setFilterConfirmed,
    filterHasCot,
    setFilterHasCot,
    filterIsDistill,
    setFilterIsDistill,
    filterScoreRange,
    setFilterScoreRange,
    filterCustomTag,
    setFilterCustomTag,
    filterNoteKeyword,
    setFilterNoteKeyword,
    filterChunkName,
    setFilterChunkName,
    searchQuery,
    setSearchQuery,
    searchField,
    setSearchField,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    isInitialized,
    getActiveFilterCount
  } = useDatasetFilters(projectId);

  const debouncedSearchQuery = useDebounce(searchQuery);
  // 刪除進度狀態
  const [deleteProgress, setDeteleProgress] = useState({
    total: 0, // 總刪除問題數量
    completed: 0, // 已刪除完成的數量
    percentage: 0 // 進度百分比
  });
  // 匯出進度狀態
  const [exportProgress, setExportProgress] = useState({
    show: false, // 是否顯示進度
    processed: 0, // 已處理數量
    total: 0, // 總數量
    hasMore: true // 是否還有更多資料
  });

  // 3. 新增開啟匯出對話方塊的處理函式
  const handleOpenExportDialog = () => {
    setExportDialog({ open: true });
  };

  // 4. 新增關閉匯出對話方塊的處理函式
  const handleCloseExportDialog = () => {
    setExportDialog({ open: false });
  };

  // 5. 新增開啟匯入對話方塊的處理函式
  const handleOpenImportDialog = () => {
    setImportDialog({ open: true });
  };

  // 6. 新增關閉匯入對話方塊的處理函式
  const handleCloseImportDialog = () => {
    setImportDialog({ open: false });
  };

  // 7. 匯入成功後的處理函式
  const handleImportSuccess = () => {
    // 重新整理資料集列表
    getDatasetsList();
    toast.success(t('import.importSuccess', '資料集匯入成功'));
  };

  // 獲取資料集列表
  const getDatasetsList = useCallback(
    async ({ pageOverride } = {}) => {
      const effectivePage = pageOverride ?? page;
      try {
        setLoading(true);
        let url = `/api/projects/${projectId}/datasets?page=${effectivePage}&size=${rowsPerPage}`;

        if (filterConfirmed !== 'all') {
          url += `&status=${filterConfirmed}`;
        }

        if (debouncedSearchQuery) {
          url += `&input=${encodeURIComponent(debouncedSearchQuery)}&field=${searchField}`;
        }

        if (filterHasCot !== 'all') {
          url += `&hasCot=${filterHasCot}`;
        }

        if (filterIsDistill !== 'all') {
          url += `&isDistill=${filterIsDistill}`;
        }

        if (filterScoreRange[0] > 0 || filterScoreRange[1] < 5) {
          url += `&scoreRange=${filterScoreRange[0]}-${filterScoreRange[1]}`;
        }

        if (filterCustomTag) {
          url += `&customTag=${encodeURIComponent(filterCustomTag)}`;
        }

        if (filterNoteKeyword) {
          url += `&noteKeyword=${encodeURIComponent(filterNoteKeyword)}`;
        }

        if (filterChunkName) {
          url += `&chunkName=${encodeURIComponent(filterChunkName)}`;
        }

        const response = await axios.get(url);
        setDatasets(response.data || { data: [], total: 0, confirmedCount: 0 });
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [
      debouncedSearchQuery,
      filterConfirmed,
      filterCustomTag,
      filterHasCot,
      filterIsDistill,
      filterNoteKeyword,
      filterChunkName,
      filterScoreRange,
      page,
      projectId,
      rowsPerPage,
      searchField
    ]
  );

  useEffect(() => {
    if (!isInitialized) return;

    getDatasetsList();
    // 獲取專案中所有使用過的標籤
    const fetchAvailableTags = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/datasets/tags`);
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error('獲取標籤失敗:', error);
      }
    };
    fetchAvailableTags();
  }, [projectId, page, rowsPerPage, debouncedSearchQuery, searchField, isInitialized]);

  // 處理頁碼變化
  const handlePageChange = (_event, newPage) => {
    // MUI TablePagination 的頁碼從 0 開始，而我們的 API 從 1 開始
    setPage(newPage + 1);
  };

  // 處理每頁行數變化
  const handleRowsPerPageChange = event => {
    setPage(1);
    setRowsPerPage(parseInt(event.target.value, 10));
  };

  // 開啟刪除確認框
  const handleOpenDeleteDialog = dataset => {
    setDeleteDialog({
      open: true,
      datasets: [dataset]
    });
  };

  // 關閉刪除確認框
  const handleCloseDeleteDialog = () => {
    setDeleteDialog({
      open: false,
      dataset: null
    });
  };

  const handleBatchDeleteDataset = async () => {
    const datasetsArray = selectedIds.map(id => ({ id }));
    setDeleteDialog({
      open: true,
      datasets: datasetsArray,
      batch: true,
      count: selectedIds.length
    });
  };

  const resetProgress = () => {
    setDeteleProgress({
      total: deleteDialog.count,
      completed: 0,
      percentage: 0
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.batch) {
      setDeleteDialog({
        ...deleteDialog,
        deleting: true
      });
      await handleBatchDelete();
      resetProgress();
    } else {
      const [dataset] = deleteDialog.datasets;
      if (!dataset) return;
      await handleDelete(dataset);
    }
    setselectedIds([]);
    // 重新整理資料
    getDatasetsList();
    // 關閉確認框
    handleCloseDeleteDialog();
  };

  // 批次刪除資料集
  const handleBatchDelete = async () => {
    try {
      await processInParallel(
        selectedIds,
        async datasetId => {
          await fetch(`/api/projects/${projectId}/datasets?id=${datasetId}`, {
            method: 'DELETE'
          });
        },
        3,
        (cur, total) => {
          setDeteleProgress({
            total,
            completed: cur,
            percentage: Math.floor((cur / total) * 100)
          });
        }
      );

      toast.success(t('common.deleteSuccess'));
    } catch (error) {
      console.error('批次刪除失敗:', error);
      toast.error(error.message || t('common.deleteFailed'));
    }
  };

  // 刪除資料集
  const handleDelete = async dataset => {
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets?id=${dataset.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(t('datasets.deleteFailed'));

      toast.success(t('datasets.deleteSuccess'));
    } catch (error) {
      toast.error(error.message || t('datasets.deleteFailed'));
    }
  };

  // 使用自定義 Hook 處理資料集匯出邏輯
  const { exportDatasets, exportDatasetsStreaming } = useDatasetExport(projectId);

  // 使用自定義 Hook 處理資料集評估邏輯
  const { evaluatingIds, batchEvaluating, handleEvaluateDataset, handleBatchEvaluate } = useDatasetEvaluation(
    projectId,
    getDatasetsList
  );

  // 處理匯出資料集 - 智慧選擇匯出方式
  const handleExportDatasets = async exportOptions => {
    try {
      // 如果是平衡匯出，則忽略選中項，按 balanceConfig 匯出
      const exportOptionsWithSelection = exportOptions.balanceMode
        ? { ...exportOptions }
        : { ...exportOptions, ...(selectedIds.length > 0 && { selectedIds }) };

      // 獲取資料總量：
      // 平衡匯出時，按 balanceConfig 的總量計算；
      // 其他情況：如果有選中資料集則使用選中數量，否則使用當前篩選條件下的資料總量
      const balancedTotal = Array.isArray(exportOptions.balanceConfig)
        ? exportOptions.balanceConfig.reduce((sum, c) => sum + (parseInt(c.maxCount) || 0), 0)
        : 0;
      const totalCount = exportOptions.balanceMode
        ? balancedTotal
        : selectedIds.length > 0
          ? selectedIds.length
          : datasets.total || 0;

      // 設定閾值：超過1000條資料使用流式匯出
      const STREAMING_THRESHOLD = 1000;

      // 檢查是否需要包含文字塊內容
      const needsChunkContent = exportOptions.formatType === 'custom' && exportOptions.customFields?.includeChunk;

      let success = false;

      // 如果資料量大於閾值或需要查詢文字塊內容，使用流式匯出
      if (totalCount > STREAMING_THRESHOLD || needsChunkContent) {
        // 使用流式匯出，顯示進度
        setExportProgress({ show: true, processed: 0, total: totalCount });

        success = await exportDatasetsStreaming(exportOptionsWithSelection, progress => {
          setExportProgress(prev => ({
            ...prev,
            processed: progress.processed,
            hasMore: progress.hasMore
          }));
        });

        // 隱藏進度
        setExportProgress({ show: false, processed: 0, total: 0 });
      } else {
        // 使用傳統匯出方式
        success = await exportDatasets(exportOptionsWithSelection);
      }

      if (success) {
        // 關閉export對話方塊
        handleCloseExportDialog();
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress({ show: false, processed: 0, total: 0 });
    }
  };

  // 檢視詳情
  const handleViewDetails = id => {
    router.push(`/projects/${projectId}/datasets/${id}`);
  };

  // 處理全選/取消全選
  const handleSelectAll = async event => {
    if (event.target.checked) {
      // 獲取所有符合當前篩選條件的資料，不受分頁限制
      let url = `/api/projects/${projectId}/datasets?selectedAll=1`;

      if (filterConfirmed !== 'all') {
        url += `&status=${filterConfirmed}`;
      }

      if (debouncedSearchQuery) {
        url += `&input=${encodeURIComponent(debouncedSearchQuery)}&field=${searchField}`;
      }

      if (filterHasCot !== 'all') {
        url += `&hasCot=${filterHasCot}`;
      }

      if (filterIsDistill !== 'all') {
        url += `&isDistill=${filterIsDistill}`;
      }

      if (filterScoreRange[0] > 0 || filterScoreRange[1] < 5) {
        url += `&scoreRange=${filterScoreRange[0]}-${filterScoreRange[1]}`;
      }

      if (filterCustomTag) {
        url += `&customTag=${encodeURIComponent(filterCustomTag)}`;
      }

      if (filterNoteKeyword) {
        url += `&noteKeyword=${encodeURIComponent(filterNoteKeyword)}`;
      }

      const response = await axios.get(url);
      setselectedIds(response.data.map(dataset => dataset.id));
    } else {
      setselectedIds([]);
    }
  };

  // 處理單個選擇
  const handleSelectItem = id => {
    setselectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleResetFilters = useCallback(() => {
    setFilterConfirmed('all');
    setFilterHasCot('all');
    setFilterIsDistill('all');
    setFilterScoreRange([0, 5]);
    setFilterCustomTag('');
    setFilterNoteKeyword('');
    setFilterChunkName('');
    setPage(1);
    getDatasetsList({ pageOverride: 1 });
  }, [
    getDatasetsList,
    setFilterConfirmed,
    setFilterHasCot,
    setFilterIsDistill,
    setFilterScoreRange,
    setFilterCustomTag,
    setFilterNoteKeyword,
    setFilterChunkName,
    setPage
  ]);

  const handleApplyFilters = useCallback(() => {
    setFilterDialogOpen(false);
    setPage(1);
    getDatasetsList({ pageOverride: 1 });
  }, [getDatasetsList, setFilterDialogOpen, setPage]);
  const handleCloseFilterDialog = useCallback(() => setFilterDialogOpen(false), [setFilterDialogOpen]);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
      <Card
        elevation={0}
        sx={{
          mb: 4,
          p: 3,
          backgroundColor: alpha(theme.palette.primary.light, 0.05),
          borderRadius: 2
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <SearchBar
            searchQuery={searchQuery}
            searchField={searchField}
            onSearchQueryChange={value => {
              setSearchQuery(value);
              setPage(1);
            }}
            onSearchFieldChange={value => {
              setSearchField(value);
              setPage(1);
            }}
            onMoreFiltersClick={() => setFilterDialogOpen(true)}
            activeFilterCount={getActiveFilterCount()}
          />
          <ActionBar
            batchEvaluating={batchEvaluating}
            onBatchEvaluate={handleBatchEvaluate}
            onImport={handleOpenImportDialog}
            onExport={handleOpenExportDialog}
          />
        </Box>
      </Card>
      {selectedIds.length ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginTop: '10px',
            gap: 2
          }}
        >
          <Typography variant="body1" color="text.secondary">
            {t('datasets.selected', {
              count: selectedIds.length
            })}
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ borderRadius: 2 }}
            onClick={handleBatchDeleteDataset}
          >
            {t('datasets.batchDelete')}
          </Button>
        </Box>
      ) : (
        ''
      )}

      <DatasetList
        datasets={datasets.data || []}
        onViewDetails={handleViewDetails}
        onDelete={handleOpenDeleteDialog}
        onEvaluate={handleEvaluateDataset}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        total={datasets.total || 0}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onSelectItem={handleSelectItem}
        evaluatingIds={evaluatingIds}
        loading={loading}
      />

      <DeleteConfirmDialog
        open={deleteDialog.open}
        datasets={deleteDialog.datasets || []}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteConfirm}
        batch={deleteDialog.batch}
        progress={deleteProgress}
        deleting={deleteDialog.deleting}
      />

      <FilterDialog
        open={filterDialogOpen}
        onClose={handleCloseFilterDialog}
        filterConfirmed={filterConfirmed}
        filterHasCot={filterHasCot}
        filterIsDistill={filterIsDistill}
        filterScoreRange={filterScoreRange}
        filterCustomTag={filterCustomTag}
        filterNoteKeyword={filterNoteKeyword}
        filterChunkName={filterChunkName}
        availableTags={availableTags}
        onFilterConfirmedChange={setFilterConfirmed}
        onFilterHasCotChange={setFilterHasCot}
        onFilterIsDistillChange={setFilterIsDistill}
        onFilterScoreRangeChange={setFilterScoreRange}
        onFilterCustomTagChange={setFilterCustomTag}
        onFilterNoteKeywordChange={setFilterNoteKeyword}
        onFilterChunkNameChange={setFilterChunkName}
        onResetFilters={handleResetFilters}
        onApplyFilters={handleApplyFilters}
      />

      <ExportDatasetDialog
        open={exportDialog.open}
        onClose={handleCloseExportDialog}
        onExport={handleExportDatasets}
        projectId={projectId}
      />

      <ImportDatasetDialog
        open={importDialog.open}
        onClose={handleCloseImportDialog}
        onImportSuccess={handleImportSuccess}
        projectId={projectId}
      />

      {/* 匯出進度對話方塊 */}
      <ExportProgressDialog open={exportProgress.show} progress={exportProgress} />
    </Container>
  );
}
