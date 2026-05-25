'use client';

import { Container, Box, Typography, Alert, Snackbar, Paper } from '@mui/material';
import { useEffect } from 'react';
import ChunkViewDialog from '@/components/text-split/ChunkViewDialog';
import DatasetHeader from '@/components/datasets/DatasetHeader';
import DatasetMetadata from '@/components/datasets/DatasetMetadata';
import EditableField from '@/components/datasets/EditableField';
import OptimizeDialog from '@/components/datasets/OptimizeDialog';
import DatasetRatingSection from '@/components/datasets/DatasetRatingSection';
import useDatasetDetails from '@/app/projects/[projectId]/datasets/[datasetId]/useDatasetDetails';
import { useTranslation } from 'react-i18next';

/**
 * 資料集詳情頁面
 */
export default function DatasetDetailsPage({ params }) {
  const { projectId, datasetId } = params;

  const { t } = useTranslation();
  // 使用自定義Hook管理狀態和邏輯
  const {
    currentDataset,
    loading,
    editingAnswer,
    editingCot,
    editingQuestion,
    answerValue,
    cotValue,
    questionValue,
    snackbar,
    confirming,
    unconfirming,
    optimizeDialog,
    viewDialogOpen,
    viewChunk,
    datasetsAllCount,
    datasetsConfirmCount,
    answerTokens,
    cotTokens,
    shortcutsEnabled,
    setShortcutsEnabled,
    setSnackbar,
    setAnswerValue,
    setCotValue,
    setQuestionValue,
    setEditingAnswer,
    setEditingCot,
    setEditingQuestion,
    handleNavigate,
    handleConfirm,
    handleUnconfirm,
    handleSave,
    handleDelete,
    handleOpenOptimizeDialog,
    handleCloseOptimizeDialog,
    handleOptimize,
    handleViewChunk,
    handleCloseViewDialog
  } = useDatasetDetails(projectId, datasetId);

  // 載入狀態
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <Alert severity="info">{t('datasets.loadingDataset')}</Alert>
        </Box>
      </Container>
    );
  }

  // 無資料狀態
  if (!currentDataset) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{t('datasets.datasetNotFound')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* 頂部導航欄 */}
      <DatasetHeader
        projectId={projectId}
        datasetsAllCount={datasetsAllCount}
        datasetsConfirmCount={datasetsConfirmCount}
        confirming={confirming}
        unconfirming={unconfirming}
        currentDataset={currentDataset}
        shortcutsEnabled={shortcutsEnabled}
        setShortcutsEnabled={setShortcutsEnabled}
        onNavigate={handleNavigate}
        onConfirm={handleConfirm}
        onUnconfirm={handleUnconfirm}
        onDelete={handleDelete}
      />

      {/* 主要佈局：左右分欄 */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* 左側主要內容區域 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            <EditableField
              label={t('datasets.question')}
              value={questionValue}
              editing={editingQuestion}
              onEdit={() => setEditingQuestion(true)}
              onChange={e => setQuestionValue(e.target.value)}
              onSave={() => handleSave('question', questionValue)}
              dataset={currentDataset}
              onCancel={() => {
                setEditingQuestion(false);
                setQuestionValue(currentDataset.question);
              }}
            />

            <EditableField
              label={t('datasets.answer')}
              value={answerValue}
              editing={editingAnswer}
              onEdit={() => setEditingAnswer(true)}
              onChange={e => setAnswerValue(e.target.value)}
              onSave={() => handleSave('answer', answerValue)}
              onCancel={() => {
                setEditingAnswer(false);
                setAnswerValue(currentDataset.answer);
              }}
              dataset={currentDataset}
              onOptimize={handleOpenOptimizeDialog}
              tokenCount={answerTokens}
              optimizing={optimizeDialog.loading}
            />

            <EditableField
              label={t('datasets.cot')}
              value={cotValue}
              editing={editingCot}
              onEdit={() => setEditingCot(true)}
              onChange={e => setCotValue(e.target.value)}
              onSave={() => handleSave('cot', cotValue)}
              dataset={currentDataset}
              onCancel={() => {
                setEditingCot(false);
                setCotValue(currentDataset.cot || '');
              }}
              tokenCount={cotTokens}
            />
          </Paper>
        </Box>

        {/* 右側固定側邊欄 */}
        <Box
          sx={{
            width: 360,
            position: 'sticky',
            top: 24,
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto'
          }}
        >
          {/* 資料集元資料資訊 */}
          <DatasetMetadata currentDataset={currentDataset} onViewChunk={handleViewChunk} />

          {/* 評分、標籤、備註區域 */}
          <DatasetRatingSection
            dataset={currentDataset}
            projectId={projectId}
            onUpdate={() => {
              // 更新成功後重新整理資料，保持頁面狀態同步
              // 這裡可以呼叫 useDatasetDetails 的重新整理邏輯
            }}
            currentDataset={currentDataset}
          />
        </Box>
      </Box>

      {/* 訊息提示 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* AI最佳化對話方塊 */}
      <OptimizeDialog open={optimizeDialog.open} onClose={handleCloseOptimizeDialog} onConfirm={handleOptimize} />

      {/* 文字塊詳情對話方塊 */}
      <ChunkViewDialog open={viewDialogOpen} chunk={viewChunk} onClose={handleCloseViewDialog} />
    </Container>
  );
}
