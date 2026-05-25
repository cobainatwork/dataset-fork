'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAtomValue } from 'jotai';
import { selectedModelInfoAtom } from '@/lib/store';

/**
 * 資料集評估相關的自定義 Hook
 * 封裝單個評估和批次評估的邏輯
 */
const useDatasetEvaluation = (projectId, onEvaluationComplete) => {
  const router = useRouter();
  const { t } = useTranslation();
  const model = useAtomValue(selectedModelInfoAtom);

  // 評估狀態管理
  const [evaluatingIds, setEvaluatingIds] = useState([]);
  const [batchEvaluating, setBatchEvaluating] = useState(false);

  /**
   * 檢查模型是否已配置
   */
  const checkModelConfiguration = () => {
    if (!model || !model.modelName) {
      toast.error(t('datasets.selectModelFirst', '請先選擇模型'));
      return false;
    }
    return true;
  };

  /**
   * 處理單個數據集評估
   * @param {Object} dataset - 要評估的資料集物件
   */
  const handleEvaluateDataset = async dataset => {
    // 檢查模型配置
    if (!checkModelConfiguration()) {
      return;
    }

    try {
      // 新增到評估中的ID列表
      setEvaluatingIds(prev => [...prev, dataset.id]);

      // 呼叫評估介面
      const evaluateResponse = await fetch(`/api/projects/${projectId}/datasets/${dataset.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          language: 'zh-CN'
        })
      });

      const result = await evaluateResponse.json();

      if (result.success) {
        toast.success(
          t('datasets.evaluateSuccess', '評估完成！評分：{{score}}/5', {
            score: result.data.score
          })
        );

        // 呼叫回撥函式通知評估完成（通常用於重新整理資料列表）
        if (onEvaluationComplete) {
          await onEvaluationComplete();
        }
      } else {
        toast.error(result.message || t('datasets.evaluateFailed', '評估失敗'));
      }
    } catch (error) {
      console.error('評估失敗:', error);
      toast.error(
        t('datasets.evaluateError', '評估失敗: {{error}}', {
          error: error.message
        })
      );
    } finally {
      // 從評估中的ID列表移除
      setEvaluatingIds(prev => prev.filter(id => id !== dataset.id));
    }
  };

  /**
   * 處理批次評估
   */
  const handleBatchEvaluate = async () => {
    // 檢查模型配置
    if (!checkModelConfiguration()) {
      return;
    }

    try {
      setBatchEvaluating(true);

      // 呼叫批次評估介面
      const response = await fetch(`/api/projects/${projectId}/datasets/batch-evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          language: 'zh-CN'
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(t('datasets.batchEvaluateStarted', '批次評估任務已啟動，將在後臺進行處理'));
        // 跳轉到任務頁面檢視進度
        router.push(`/projects/${projectId}/tasks`);
      } else {
        toast.error(result.message || t('datasets.batchEvaluateStartFailed', '啟動批次評估失敗'));
      }
    } catch (error) {
      console.error('批次評估失敗:', error);
      toast.error(
        t('datasets.batchEvaluateFailed', '批次評估失敗: {{error}}', {
          error: error.message
        })
      );
    } finally {
      setBatchEvaluating(false);
    }
  };

  /**
   * 檢查指定資料集是否正在評估中
   * @param {string} datasetId - 資料集ID
   * @returns {boolean} 是否正在評估中
   */
  const isEvaluating = datasetId => {
    return evaluatingIds.includes(datasetId);
  };

  /**
   * 獲取當前正在評估的資料集數量
   * @returns {number} 正在評估的資料集數量
   */
  const getEvaluatingCount = () => {
    return evaluatingIds.length;
  };

  return {
    // 狀態
    evaluatingIds,
    batchEvaluating,

    // 方法
    handleEvaluateDataset,
    handleBatchEvaluate,

    // 工具方法
    isEvaluating,
    getEvaluatingCount,

    // 模型資訊（便於元件使用）
    model
  };
};

export default useDatasetEvaluation;
