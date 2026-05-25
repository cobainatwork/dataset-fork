'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import FileUploadStep from './import/FileUploadStep';
// import DatasetSourceStep from './import/DatasetSourceStep'; // 不再需要
import FieldMappingStep from './import/FieldMappingStep';
import ImportProgressStep from './import/ImportProgressStep';

/**
 * 資料集匯入對話方塊
 */
export default function ImportDatasetDialog({ open, onClose, projectId, onImportSuccess }) {
  const { t } = useTranslation();
  const [importType, setImportType] = useState('file'); // 只支援檔案上傳
  const [currentStep, setCurrentStep] = useState(0);
  const [importData, setImportData] = useState({
    rawData: null,
    previewData: null,
    fieldMapping: {},
    sourceInfo: null
  });
  const [error, setError] = useState('');

  const steps = [
    t('import.fileUpload', '檔案上傳'),
    t('import.mapFields', '欄位對映'),
    t('import.importing', '匯入中')
  ];

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleClose = () => {
    setCurrentStep(0);
    setImportData({
      rawData: null,
      previewData: null,
      fieldMapping: {},
      sourceInfo: null
    });
    setError('');
    onClose();
  };

  const handleDataLoaded = (data, preview, source) => {
    setImportData({
      ...importData,
      rawData: data,
      previewData: preview,
      sourceInfo: source
    });
    setError('');
    handleNext();
  };

  const handleFieldMappingComplete = mapping => {
    setImportData({
      ...importData,
      fieldMapping: mapping
    });
    handleNext();
  };

  const handleImportComplete = () => {
    handleClose();
    if (onImportSuccess) {
      onImportSuccess();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <FileUploadStep onDataLoaded={handleDataLoaded} onError={setError} />;
      case 1:
        return (
          <FieldMappingStep
            previewData={importData.previewData}
            onMappingComplete={handleFieldMappingComplete}
            onError={setError}
          />
        );
      case 2:
        return (
          <ImportProgressStep
            projectId={projectId}
            rawData={importData.rawData}
            fieldMapping={importData.fieldMapping}
            sourceInfo={importData.sourceInfo}
            onComplete={handleImportComplete}
            onError={setError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 600 }
      }}
    >
      <DialogTitle>{t('import.title', '匯入資料集')}</DialogTitle>

      <DialogContent>
        {/* 匯入型別選擇 - 只保留檔案上傳 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {t('import.fileUpload', '檔案上傳')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('import.fileUploadDescription', '上傳本地檔案匯入資料集')}
          </Typography>
        </Box>

        {/* 步驟指示器 */}
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* 錯誤提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 步驟內容 */}
        <Box sx={{ minHeight: 300 }}>{renderStepContent()}</Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>{t('common.cancel', '取消')}</Button>
        {currentStep > 0 && currentStep < 2 && <Button onClick={handleBack}>{t('common.back', '上一步')}</Button>}
      </DialogActions>
    </Dialog>
  );
}
