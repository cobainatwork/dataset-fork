'use client';

import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import SaveIcon from '@mui/icons-material/Save';
import AnswerInput from '../../images/components/annotation/AnswerInput';

function handleAnswer(dataset) {
  const { answer, answerType } = dataset;
  if (answerType === 'label' || answerType === 'custom_format') {
    try {
      return JSON.parse(answer);
    } catch (e) {
      return answer;
    }
  }
  return answer;
}

/**
 * 資料集主要內容元件
 */
export default function DatasetContent({ dataset, projectId, onAnswerChange }) {
  const { t } = useTranslation();
  const [currentAnswer, setCurrentAnswer] = useState(() => handleAnswer(dataset));
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // 當 dataset 變化時，重置狀態
  useEffect(() => {
    setCurrentAnswer(handleAnswer(dataset));
    setHasChanges(false);
  }, [dataset.id, dataset.answer]);

  // 處理答案變化
  const handleAnswerChange = newAnswer => {
    setCurrentAnswer(newAnswer);

    // 檢測是否有變化
    const originalAnswer = handleAnswer(dataset);
    const hasChanged = JSON.stringify(newAnswer) !== JSON.stringify(originalAnswer);
    setHasChanges(hasChanged);
  };

  // 儲存答案
  const handleSave = async () => {
    setSaving(true);
    try {
      let answerToSave = currentAnswer;
      if (typeof answerToSave !== 'string') {
        answerToSave = JSON.stringify(answerToSave, null, 2);
      }
      await onAnswerChange(answerToSave);
      setHasChanges(false);
    } catch (error) {
      console.error('儲存失敗:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Paper sx={{ p: 3 }}>
        {/* 問題和儲存按鈕 */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            variant="body1"
            sx={{
              flex: 1,
              fontSize: '1rem',
              lineHeight: 1.7,
              fontWeight: 600,
              backgroundColor: 'grey.100',
              p: 2,
              borderRadius: 2
            }}
          >
            {dataset.question}
          </Typography>

          {/* 儲存按鈕 - 只在有變化時顯示 */}
          {hasChanges && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                minWidth: 100,
                height: 'fit-content',
                whiteSpace: 'nowrap'
              }}
            >
              {saving ? t('common.saving', '儲存中...') : t('common.save', '儲存')}
            </Button>
          )}
        </Box>

        {/* 答案編輯器 */}
        <AnswerInput
          answerType={dataset.answerType || 'text'}
          answer={currentAnswer}
          onAnswerChange={handleAnswerChange}
          labels={dataset.availableLabels || []}
          customFormat={dataset.customFormat}
          projectId={projectId}
          imageName={dataset.imageName}
          question={dataset.questionData}
        />

        {/* 圖片 */}
        <Box sx={{ mt: 3 }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: '800px',
              margin: '0 auto',
              paddingTop: '56.25%',
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'grey.100',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            {dataset.base64 ? (
              <img
                src={dataset.base64}
                alt={dataset.imageName}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <Image src="/placeholder.png" alt={dataset.imageName} fill style={{ objectFit: 'contain' }} unoptimized />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
            {dataset.imageName}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
