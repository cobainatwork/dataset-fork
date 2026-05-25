'use client';

import { Container, Box, CircularProgress, Alert } from '@mui/material';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import useImageDatasetDetails from '../hooks/useImageDatasetDetails';
import ImageDatasetHeader from '../components/ImageDatasetHeader';
import DatasetContent from '../components/DatasetContent';
import DatasetSidebar from '../components/DatasetSidebar';

export default function ImageDatasetDetailPage() {
  const { projectId, datasetId } = useParams();
  const { t } = useTranslation();

  const {
    currentDataset,
    loading,
    confirming,
    unconfirming,
    datasetsAllCount,
    datasetsConfirmCount,
    updateDataset,
    handleNavigate,
    handleConfirm,
    handleUnconfirm,
    handleDelete
  } = useImageDatasetDetails(projectId, datasetId);

  // 載入狀態
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // 無資料狀態
  if (!currentDataset) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error">{t('imageDatasets.notFound', '資料集不存在')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* 頂部導航欄 */}
      <ImageDatasetHeader
        projectId={projectId}
        datasetsAllCount={datasetsAllCount}
        datasetsConfirmCount={datasetsConfirmCount}
        confirming={confirming}
        unconfirming={unconfirming}
        currentDataset={currentDataset}
        onNavigate={handleNavigate}
        onConfirm={handleConfirm}
        onUnconfirm={handleUnconfirm}
        onDelete={handleDelete}
      />

      {/* 主要佈局：左右分欄 */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* 左側主要內容區域 */}
        <DatasetContent
          dataset={currentDataset}
          projectId={projectId}
          onAnswerChange={async newAnswer => {
            // 直接傳遞答案字串，DatasetContent 已經處理了格式轉換
            await updateDataset({ answer: newAnswer });
          }}
        />

        {/* 右側固定側邊欄 */}
        <DatasetSidebar dataset={currentDataset} projectId={projectId} onUpdate={updateDataset} />
      </Box>
    </Container>
  );
}
