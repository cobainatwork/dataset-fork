'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { selectedModelInfoAtom } from '@/lib/store';
import { useAtomValue } from 'jotai/index';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import axios from 'axios';

/**
 * 檔案處理的自定義Hook
 * @param {string} projectId - 專案ID
 * @returns {Object} - 檔案處理狀態和操作方法
 */
export default function useFileProcessing(projectId) {
  const { t } = useTranslation();
  const [fileProcessing, setFileProcessing] = useState(false);
  const [progress, setProgress] = useState({
    total: 0,
    completed: 0,
    percentage: 0,
    questionCount: 0
  });
  const model = useAtomValue(selectedModelInfoAtom);

  /**
   * 重置進度狀態
   */
  const resetProgress = useCallback(() => {
    setTimeout(() => {
      setProgress({
        total: 0,
        completed: 0,
        percentage: 0,
        questionCount: 0
      });
    }, 1000); // 延遲重置，讓使用者看到完成的進度
  }, []);

  /**
   * 處理檔案
   * @param {Array} files - 檔案列表
   * @param {string} pdfStrategy - PDF處理策略
   * @param {string} selectedViosnModel - 選定的視覺模型
   */
  const handleFileProcessing = useCallback(
    async (files, pdfStrategy, selectedViosnModel, domainTreeAction) => {
      try {
        const currentLanguage = i18n.language;

        //獲取到視覺策略要使用的模型
        const availableModels = JSON.parse(localStorage.getItem('modelConfigList'));
        const vsionModel = availableModels.find(m => m.id === selectedViosnModel);

        const response = await axios.post(`/api/projects/${projectId}/tasks`, {
          taskType: 'file-processing',
          modelInfo: model,
          language: currentLanguage,
          detail: '檔案處理任務',
          note: {
            vsionModel,
            projectId,
            fileList: files,
            strategy: pdfStrategy,
            domainTreeAction
          }
        });

        if (response.data?.code !== 0) {
          throw new Error(t('textSplit.pdfProcessingFailed') + (response.data?.error || ''));
        }

        //提示後臺任務進行中
        toast.success(t('textSplit.pdfProcessingToast'));
      } catch (error) {
        toast.error(t('textSplit.pdfProcessingFailed') + error.message || '');
      }
    },
    [projectId, t, resetProgress, model]
  );

  return {
    fileProcessing,
    progress,
    setFileProcessing,
    setProgress,
    handleFileProcessing,
    resetProgress
  };
}
