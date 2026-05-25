'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon, Info as InfoIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

/**
 * 匯入進度步驟元件
 */
export default function ImportProgressStep({ projectId, rawData, fieldMapping, sourceInfo, onComplete, onError }) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [importStats, setImportStats] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  });
  const [completed, setCompleted] = useState(false);
  const startedRef = useRef(false); // 防止在開發模式下因嚴格模式導致重複執行

  useEffect(() => {
    if (!startedRef.current && rawData && fieldMapping && projectId) {
      startedRef.current = true;
      startImport();
    }
  }, [rawData, fieldMapping, projectId]);

  const startImport = async () => {
    try {
      setCurrentStep(t('import.preparingData', '準備資料...'));
      setImportStats(prev => ({ ...prev, total: rawData.length }));

      // 轉換資料格式
      const convertedData = rawData.map(item => {
        // 支援 question 對映多個欄位，拼接為一個字串
        const qFields = fieldMapping.question;
        const question = Array.isArray(qFields)
          ? qFields
              .map(f => item[f] || '')
              .filter(v => v && String(v).trim())
              .join('\n')
          : item[qFields] || '';

        const converted = {
          question,
          answer: item[fieldMapping.answer] || '',
          cot: fieldMapping.cot ? item[fieldMapping.cot] || '' : '',
          questionLabel: '', // 預設標籤，後續可以透過AI生成
          chunkName: sourceInfo?.datasetName || sourceInfo?.fileName || 'Imported Data',
          chunkContent: `Imported from ${sourceInfo?.type || 'file'}`,
          model: 'imported',
          confirmed: false,
          score: 0,
          tags: fieldMapping.tags ? JSON.stringify(parseTagsField(item[fieldMapping.tags])) : '[]',
          note: '',
          other: JSON.stringify(getOtherFields(item, fieldMapping))
        };

        // 不在前端拋錯，由後端負責校驗並統計 skipped
        return converted;
      });

      setProgress(25);
      setCurrentStep(t('import.uploadingData', '上傳資料...'));

      // 分批上傳資料
      const batchSize = 500;
      let processed = 0;
      let success = 0;
      let failed = 0;
      let skipped = 0;
      const errors = [];

      for (let i = 0; i < convertedData.length; i += batchSize) {
        const batch = convertedData.slice(i, i + batchSize);

        try {
          const response = await fetch(`/api/projects/${projectId}/datasets/import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              datasets: batch,
              sourceInfo
            })
          });

          if (!response.ok) {
            throw new Error(`批次上傳失敗: ${response.statusText}`);
          }

          const result = await response.json();
          success += result.success || 0;
          failed += typeof result.failed === 'number' ? result.failed : result.errors?.length || 0;
          skipped += result.skipped || 0;
          processed += batch.length;

          if (result.errors && result.errors.length > 0) {
            errors.push(...result.errors);
          }
        } catch (error) {
          failed += batch.length;
          processed += batch.length;
          errors.push(`批次 ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        }

        // 更新進度
        const progressPercent = 25 + (processed / convertedData.length) * 70;
        setProgress(progressPercent);
        setImportStats({
          total: convertedData.length,
          processed,
          success,
          failed,
          skipped,
          errors
        });

        setCurrentStep(
          t('import.processing', '處理中... {{processed}}/{{total}}', {
            processed,
            total: convertedData.length
          })
        );
      }

      setProgress(100);
      setCurrentStep(t('import.completed', '匯入完成'));
      setCompleted(true);

      // 延遲一下再呼叫完成回撥，讓使用者看到完成狀態
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      onError(error.message);
      setImportStats(prev => ({
        ...prev,
        errors: [...prev.errors, error.message]
      }));
    }
  };

  // 解析標籤欄位
  const parseTagsField = tagsValue => {
    if (!tagsValue) return [];

    if (Array.isArray(tagsValue)) {
      return tagsValue;
    }

    if (typeof tagsValue === 'string') {
      return tagsValue
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
    }

    return [];
  };

  // 獲取其他欄位（相容陣列對映）
  const getOtherFields = (item, mapping) => {
    const used = [];
    Object.values(mapping).forEach(field => {
      if (!field) return;
      if (Array.isArray(field)) used.push(...field);
      else used.push(field);
    });
    const mappedFields = new Set(used);
    const otherFields = {};

    Object.keys(item).forEach(key => {
      if (!mappedFields.has(key)) {
        otherFields[key] = item[key];
      }
    });

    return otherFields;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('import.importing', '正在匯入資料集')}
      </Typography>

      {/* 進度條 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" gutterBottom>
          {currentStep}
        </Typography>
        <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4, mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {Math.round(progress)}% {t('import.complete', '完成')}
        </Typography>
      </Paper>

      {/* 匯入統計 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('import.importStats', '匯入統計')}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            icon={<InfoIcon />}
            label={t('import.total', '總計: {{count}}', { count: importStats.total })}
            variant="outlined"
          />
          <Chip
            icon={<CheckIcon />}
            label={t('import.success', '成功: {{count}}', { count: importStats.success })}
            color="success"
            variant="outlined"
          />
          {importStats.skipped > 0 && (
            <Chip
              icon={<InfoIcon />}
              label={t('import.skipped', '跳過: {{count}}', { count: importStats.skipped })}
              color="warning"
              variant="outlined"
            />
          )}
          {importStats.failed > 0 && (
            <Chip
              icon={<ErrorIcon />}
              label={t('import.failed', '失敗: {{count}}', { count: importStats.failed })}
              color="error"
              variant="outlined"
            />
          )}
        </Box>

        {sourceInfo && (
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('import.source', '資料來源')}:{' '}
              {sourceInfo.type === 'file' ? sourceInfo.fileName : sourceInfo.datasetName}
            </Typography>
            {sourceInfo.description && (
              <Typography variant="body2" color="text.secondary">
                {t('import.description', '描述')}: {sourceInfo.description}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* 錯誤列表 */}
      {importStats.errors.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle1" gutterBottom color="error">
            {t('import.errors', '錯誤資訊')}
          </Typography>
          <List dense>
            {importStats.errors.slice(0, 10).map((error, index) => (
              <ListItem key={index} sx={{ px: 0 }}>
                <ListItemIcon>
                  <ErrorIcon color="error" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={error} primaryTypographyProps={{ variant: 'body2' }} />
              </ListItem>
            ))}
          </List>
          {importStats.errors.length > 10 && (
            <Typography variant="body2" color="text.secondary">
              {t('import.moreErrors', '還有 {{count}} 個錯誤未顯示...', {
                count: importStats.errors.length - 10
              })}
            </Typography>
          )}
        </Paper>
      )}

      {/* 完成提示 */}
      {completed && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('import.importSuccess', '資料集匯入完成！成功匯入 {{success}} 條記錄。', {
            success: importStats.success
          })}
        </Alert>
      )}
    </Box>
  );
}
