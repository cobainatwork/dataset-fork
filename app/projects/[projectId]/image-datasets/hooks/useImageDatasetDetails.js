'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import axios from 'axios';

export default function useImageDatasetDetails(projectId, datasetId) {
  const router = useRouter();
  const { t } = useTranslation();

  const [currentDataset, setCurrentDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [unconfirming, setUnconfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [datasetsAllCount, setDatasetsAllCount] = useState(0);
  const [datasetsConfirmCount, setDatasetsConfirmCount] = useState(0);

  // 獲取資料集列表資訊
  const fetchDatasetsList = useCallback(async () => {
    try {
      // Use two lightweight requests (pageSize=1) to get total and confirmed counts
      const [allResponse, confirmedResponse] = await Promise.all([
        axios.get(`/api/projects/${projectId}/image-datasets?page=1&pageSize=1&idsOnly=true`),
        axios.get(`/api/projects/${projectId}/image-datasets?page=1&pageSize=1&confirmed=true&idsOnly=true`)
      ]);
      setDatasetsAllCount(allResponse.data.total || 0);
      setDatasetsConfirmCount(confirmedResponse.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch datasets list:', error);
    }
  }, [projectId]);

  // 獲取當前資料集詳情
  const fetchDatasetDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/image-datasets/${datasetId}`);
      setCurrentDataset(response.data);
    } catch (error) {
      console.error('Failed to fetch dataset detail:', error);
      toast.error(t('imageDatasets.fetchDetailFailed', '獲取詳情失敗'));
    } finally {
      setLoading(false);
    }
  }, [projectId, datasetId, t]);

  useEffect(() => {
    if (projectId && datasetId) {
      fetchDatasetDetail();
      fetchDatasetsList();
    }
  }, [projectId, datasetId, fetchDatasetDetail, fetchDatasetsList]);

  // 更新資料集
  const updateDataset = useCallback(
    async updates => {
      try {
        setSaving(true);
        await axios.put(`/api/projects/${projectId}/image-datasets/${datasetId}`, updates);
        toast.success(t('imageDatasets.updateSuccess', '更新成功'));
        // 重新整理資料
        await fetchDatasetDetail();
        await fetchDatasetsList();
      } catch (error) {
        console.error('Failed to update dataset:', error);
        toast.error(t('imageDatasets.updateFailed', '更新失敗'));
      } finally {
        setSaving(false);
      }
    },
    [projectId, datasetId, t, fetchDatasetDetail, fetchDatasetsList]
  );

  // 翻頁導航
  const handleNavigate = useCallback(
    async (direction, skipCurrentId = null) => {
      try {
        // Fetch only IDs (no image data) to avoid loading large base64 images for navigation
        const response = await axios.get(
          `/api/projects/${projectId}/image-datasets?page=1&pageSize=10000&idsOnly=true`
        );
        const datasets = response.data.data || [];

        if (datasets.length === 0) {
          router.push(`/projects/${projectId}/image-datasets`);
          return;
        }

        // 確定當前索引
        let currentIndex = -1;
        const searchId = skipCurrentId || datasetId;
        const currentDatasetId = String(searchId);

        // 查詢當前資料集的索引
        currentIndex = datasets.findIndex(d => String(d.id) === currentDatasetId);

        // 如果找不到（刪除場景或其他原因），從第一個開始
        if (currentIndex === -1) {
          currentIndex = 0;
        }

        // 計算下一個索引
        let nextIndex;
        if (direction === 'prev') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : datasets.length - 1;
        } else {
          nextIndex = currentIndex < datasets.length - 1 ? currentIndex + 1 : 0;
        }

        const nextDataset = datasets[nextIndex];
        if (nextDataset) {
          router.push(`/projects/${projectId}/image-datasets/${nextDataset.id}`);
        }
      } catch (error) {
        console.error('Failed to navigate:', error);
        toast.error(t('common.navigationFailed', '導航失敗'));
      }
    },
    [projectId, datasetId, router, t]
  );

  // 確認保留
  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    try {
      await updateDataset({ confirmed: true });
      // 確認後導航到下一條
      await handleNavigate('next');
    } finally {
      setConfirming(false);
    }
  }, [updateDataset, handleNavigate]);

  // 取消確認
  const handleUnconfirm = useCallback(async () => {
    setUnconfirming(true);
    try {
      await updateDataset({ confirmed: false });
    } finally {
      setUnconfirming(false);
    }
  }, [updateDataset]);

  // 刪除資料集
  const handleDelete = useCallback(async () => {
    if (confirm(t('imageDatasets.deleteConfirm', '確定要刪除這個資料集嗎？'))) {
      try {
        await axios.delete(`/api/projects/${projectId}/image-datasets/${datasetId}`);
        toast.success(t('imageDatasets.deleteSuccess', '刪除成功'));
        // 導航到下一條，傳遞 datasetId 以便 handleNavigate 知道是刪除場景
        await handleNavigate('next', datasetId);
      } catch (error) {
        console.error('Failed to delete dataset:', error);
        toast.error(t('imageDatasets.deleteFailed', '刪除失敗'));
      }
    }
  }, [projectId, datasetId, handleNavigate, t]);

  return {
    currentDataset,
    loading,
    saving,
    confirming,
    unconfirming,
    datasetsAllCount,
    datasetsConfirmCount,
    updateDataset,
    handleNavigate,
    handleConfirm,
    handleUnconfirm,
    handleDelete
  };
}
