'use client';

import { Box, Typography, Checkbox, Button, Select, MenuItem, Tooltip, Menu, IconButton, Badge } from '@mui/material';
import QuizIcon from '@mui/icons-material/Quiz';
import DownloadIcon from '@mui/icons-material/Download';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import ChunkFilterDialog from './ChunkFilterDialog';

export default function ChunkListHeader({
  projectId,
  totalChunks,
  selectedChunks,
  onSelectAll,
  onBatchGenerateQuestions,
  onBatchEditChunks,
  onBatchDeleteChunks,
  questionFilter,
  setQuestionFilter,
  chunks = [], // 新增chunks引數，用於匯出文字塊
  selectedModel = {},
  onFilterChange = null,
  activeFilterCount = 0
}) {
  const { t, i18n } = useTranslation();

  // 新增更多選單的狀態和錨點
  const [moreMenuAnchorEl, setMoreMenuAnchorEl] = useState(null);
  const isMoreMenuOpen = Boolean(moreMenuAnchorEl);

  // 新增篩選對話方塊狀態
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // 自動任務選單狀態
  const [autoTasksMenuAnchorEl, setAutoTasksMenuAnchorEl] = useState(null);
  const isAutoTasksMenuOpen = Boolean(autoTasksMenuAnchorEl);

  const handleAutoTasksClick = event => {
    setAutoTasksMenuAnchorEl(event.currentTarget);
  };

  const handleAutoTasksClose = () => {
    setAutoTasksMenuAnchorEl(null);
  };

  // 開啟更多選單
  const handleMoreMenuClick = event => {
    setMoreMenuAnchorEl(event.currentTarget);
  };

  // 關閉更多選單
  const handleMoreMenuClose = () => {
    setMoreMenuAnchorEl(null);
  };

  // 處理批次編輯，關閉選單並呼叫原有函式
  const handleBatchEdit = () => {
    handleMoreMenuClose();
    onBatchEditChunks();
  };

  // 處理批次刪除，關閉選單並呼叫原有函式
  const handleBatchDelete = () => {
    handleMoreMenuClose();
    onBatchDeleteChunks();
  };

  // 處理匯出文字塊，關閉選單並呼叫原有函式
  const handleExport = () => {
    handleMoreMenuClose();
    handleExportChunks();
  };

  // 建立自動提取問題任務
  const handleCreateAutoQuestionTask = async () => {
    if (!projectId || !selectedModel?.id) {
      toast.error(t('textSplit.selectModelFirst', { defaultValue: '請先選擇模型' }));
      return;
    }

    try {
      // 呼叫建立任務介面
      const response = await axios.post(`/api/projects/${projectId}/tasks`, {
        taskType: 'question-generation',
        modelInfo: selectedModel,
        language: i18n.language,
        detail: '批次生成問題任務'
      });

      if (response.data?.code === 0) {
        toast.success(t('tasks.createSuccess', { defaultValue: '後臺任務已建立，系統將自動處理未生成問題的文字塊' }));
      } else {
        toast.error(t('tasks.createFailed', { defaultValue: '建立任務失敗' }) + ': ' + response.data?.message);
      }
    } catch (error) {
      console.error('建立自動提取問題任務失敗:', error);
      toast.error(t('tasks.createFailed', { defaultValue: '建立任務失敗' }) + ': ' + error.message);
    }
  };

  // 建立自動資料清洗任務
  const handleCreateAutoDataCleaningTask = async () => {
    if (!projectId || !selectedModel?.id) {
      toast.error(t('textSplit.selectModelFirst', { defaultValue: '請先選擇模型' }));
      return;
    }

    try {
      // 呼叫建立任務介面
      const response = await axios.post(`/api/projects/${projectId}/tasks`, {
        taskType: 'data-cleaning',
        modelInfo: selectedModel,
        language: i18n.language,
        detail: '批次資料清洗任務'
      });

      if (response.data?.code === 0) {
        toast.success(
          t('tasks.createSuccess', { defaultValue: '後臺任務已建立，系統將自動處理所有文字塊進行資料清洗' })
        );
      } else {
        toast.error(t('tasks.createFailed', { defaultValue: '建立任務失敗' }) + ': ' + response.data?.message);
      }
    } catch (error) {
      console.error('建立自動資料清洗任務失敗:', error);
      toast.error(t('tasks.createFailed', { defaultValue: '建立任務失敗' }) + ': ' + error.message);
    }
  };

  // 建立自動生成評估資料集任務
  const handleCreateAutoEvalGenerationTask = async () => {
    if (!projectId || !selectedModel?.id) {
      toast.error(t('textSplit.selectModelFirst', { defaultValue: '請先選擇模型' }));
      return;
    }

    try {
      // 呼叫建立任務介面
      const response = await axios.post(`/api/projects/${projectId}/tasks`, {
        taskType: 'eval-generation',
        modelInfo: selectedModel,
        language: i18n.language,
        detail: '批次生成評估資料集任務'
      });

      if (response.data?.code === 0) {
        toast.success(
          t('tasks.createSuccess', {
            defaultValue: '後臺任務已建立，系統將自動為所有未生成評估題目的文字塊生成評估資料集'
          })
        );
      } else {
        toast.error(t('tasks.createFailed', { defaultValue: '建立任務失敗' }) + ': ' + response.data?.message);
      }
    } catch (error) {
      console.error('建立自動生成評估資料集任務失敗:', error);
      toast.error(t('tasks.createFailed', { defaultValue: '建立任務失敗' }) + ': ' + error.message);
    }
  };

  // 匯出文字塊為JSON檔案的函式
  const handleExportChunks = () => {
    if (!chunks || chunks.length === 0) return;

    // 建立要匯出的資料物件
    const exportData = chunks.map(chunk => ({
      name: chunk.name,
      projectId: chunk.projectId,
      fileName: chunk.fileName,
      content: chunk.content,
      summary: chunk.summary,
      size: chunk.size
    }));

    // 將資料轉換為JSON字串
    const jsonString = JSON.stringify(exportData, null, 2);

    // 建立Blob物件
    const blob = new Blob([jsonString], { type: 'application/json' });

    // 建立下載連結
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-chunks-export-${new Date().toISOString().split('T')[0]}.json`;

    // 觸發下載
    document.body.appendChild(a);
    a.click();

    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 2,
        mb: 3
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Checkbox
          checked={selectedChunks.length === totalChunks}
          indeterminate={selectedChunks.length > 0 && selectedChunks.length < totalChunks}
          onChange={onSelectAll}
        />
        <Typography variant="body1">{t('textSplit.selectedCount', { count: selectedChunks.length })}</Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexWrap: 'wrap',
          gap: 1.5,
          width: { xs: '100%', md: 'auto' }
        }}
      >
        {/* 更多篩選按鈕 */}
        <Tooltip title={t('datasets.moreFilters', { defaultValue: '更多篩選' })}>
          <Badge badgeContent={activeFilterCount} color="error" overlap="circular">
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterDialogOpen(true)}
              size="small"
              sx={{ borderRadius: 1 }}
            >
              {t('datasets.moreFilters', { defaultValue: '更多篩選' })}
            </Button>
          </Badge>
        </Tooltip>

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            mt: { xs: 1, sm: 0 },
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          <Button
            variant="contained"
            color="primary"
            startIcon={<QuizIcon />}
            disabled={selectedChunks.length === 0}
            onClick={onBatchGenerateQuestions}
            size="medium"
            sx={{ minWidth: { xs: '48%', sm: 'auto' } }}
          >
            {t('textSplit.batchGenerateQuestions')}
          </Button>

          {/* 自動任務下拉選單 */}
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AutoFixHighIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            onClick={handleAutoTasksClick}
            disabled={!projectId || !selectedModel?.id}
            size="medium"
            sx={{ minWidth: { xs: '48%', sm: 'auto' } }}
          >
            {t('textSplit.autoTasks', { defaultValue: '自動任務' })}
          </Button>

          <Menu
            anchorEl={autoTasksMenuAnchorEl}
            open={isAutoTasksMenuOpen}
            onClose={handleAutoTasksClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
          >
            <Tooltip
              title={t('textSplit.autoGenerateQuestionsTip', {
                defaultValue: '建立後臺批次處理任務：自動查詢待生成問題的文字塊並提取問題'
              })}
              placement="left"
            >
              <MenuItem
                onClick={() => {
                  handleCreateAutoQuestionTask();
                  handleAutoTasksClose();
                }}
              >
                <QuizIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} />
                {t('textSplit.autoGenerateQuestions')}
              </MenuItem>
            </Tooltip>

            <Tooltip
              title={t('textSplit.autoEvalGenerationTip', {
                defaultValue: '建立後臺批次處理任務：自動為所有未生成評估題目的文字塊生成評估資料集'
              })}
              placement="left"
            >
              <MenuItem
                onClick={() => {
                  handleCreateAutoEvalGenerationTask();
                  handleAutoTasksClose();
                }}
              >
                <AssessmentIcon fontSize="small" sx={{ mr: 1, color: 'secondary.main' }} />
                {t('textSplit.autoEvalGeneration', { defaultValue: '自動生成評估集' })}
              </MenuItem>
            </Tooltip>

            <Tooltip
              title={t('textSplit.autoDataCleaningTip', {
                defaultValue: '建立後臺批次處理任務：自動對所有文字塊進行資料清洗'
              })}
              placement="left"
            >
              <MenuItem
                onClick={() => {
                  handleCreateAutoDataCleaningTask();
                  handleAutoTasksClose();
                }}
              >
                <CleaningServicesIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                {t('textSplit.autoDataCleaning', { defaultValue: '自動資料清洗' })}
              </MenuItem>
            </Tooltip>
          </Menu>

          {/* 更多選單按鈕 */}
          <Tooltip title={t('common.more', { defaultValue: '更多操作' })}>
            <IconButton
              onClick={handleMoreMenuClick}
              color="primary"
              size="medium"
              sx={{
                border: '1px solid',
                borderColor: 'divider'
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Tooltip>

          {/* 更多操作下拉選單 */}
          <Menu
            anchorEl={moreMenuAnchorEl}
            open={isMoreMenuOpen}
            onClose={handleMoreMenuClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right'
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right'
            }}
          >
            <MenuItem onClick={handleBatchEdit} disabled={selectedChunks.length === 0}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              {t('batchEdit.batchEdit', { defaultValue: '批次編輯' })}
            </MenuItem>
            <MenuItem onClick={handleBatchDelete} disabled={selectedChunks.length === 0}>
              <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
              {t('textSplit.batchDeleteChunks', { defaultValue: '批次刪除' })}
            </MenuItem>
            <MenuItem onClick={handleExport} disabled={chunks.length === 0}>
              <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
              {t('textSplit.exportChunks', { defaultValue: '匯出文字塊' })}
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* 篩選對話方塊 */}
      <ChunkFilterDialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} onApply={onFilterChange} />
    </Box>
  );
}
