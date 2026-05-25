'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import request from '@/lib/util/request';
import { toast } from 'sonner';

/**
 * 測評題目生成的自定義Hook
 * @param {string} projectId - 專案ID
 * @returns {Object} - 測評題目生成狀態和操作方法
 */
export default function useEvalGeneration(projectId) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState({});

  /**
   * 為單個文字塊生成測評題目
   * @param {string} chunkId - 文字塊ID
   * @param {Object} selectedModelInfo - 選定的模型資訊
   * @param {Function} onSuccess - 成功回撥
   */
  const handleGenerateEvalQuestions = useCallback(
    async (chunkId, selectedModelInfo, onSuccess) => {
      try {
        // 檢查模型資訊
        if (!selectedModelInfo) {
          throw new Error(t('textSplit.selectModelFirst'));
        }

        // 設定生成狀態
        setGenerating(prev => ({ ...prev, [chunkId]: true }));

        // 獲取當前語言環境
        const currentLanguage = i18n.language;

        // 呼叫API生成測評題目
        const response = await request(
          `/api/projects/${projectId}/chunks/${encodeURIComponent(chunkId)}/eval-questions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: selectedModelInfo,
              language: currentLanguage
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('textSplit.generateEvalQuestionsFailed'));
        }

        const data = await response.json();

        // 顯示成功訊息
        toast.success(
          t('textSplit.evalQuestionsGeneratedSuccess', {
            total: data.total,
            defaultValue: `成功生成 ${data.total} 道測評題目`
          })
        );

        // 呼叫成功回撥
        if (onSuccess) {
          onSuccess(data);
        }
      } catch (error) {
        console.error('Error generating eval questions:', error);
        toast.error(error.message || t('textSplit.generateEvalQuestionsFailed'));
      } finally {
        // 清除生成狀態
        setGenerating(prev => {
          const newState = { ...prev };
          delete newState[chunkId];
          return newState;
        });
      }
    },
    [projectId, t]
  );

  return {
    generating,
    handleGenerateEvalQuestions
  };
}
