import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function useImageDatasets(projectId, filters = {}) {
  const { t } = useTranslation();
  const [datasets, setDatasets] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 使用 useMemo 穩定 filters 物件引用
  const stableFilters = useMemo(
    () => ({
      search: filters.search || '',
      confirmed: filters.confirmed,
      minScore: filters.minScore,
      maxScore: filters.maxScore
    }),
    [filters.search, filters.confirmed, filters.minScore, filters.maxScore]
  );

  // 獲取資料集列表
  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/projects/${projectId}/image-datasets?page=${page}&pageSize=${pageSize}`;

      // 搜尋條件
      if (stableFilters.search) {
        url += `&search=${encodeURIComponent(stableFilters.search)}`;
      }

      // 確認狀態篩選
      if (stableFilters.confirmed !== undefined) {
        url += `&confirmed=${stableFilters.confirmed}`;
      }

      // 評分篩選
      if (stableFilters.minScore !== undefined || stableFilters.maxScore !== undefined) {
        if (stableFilters.minScore !== undefined) {
          url += `&minScore=${stableFilters.minScore}`;
        }
        if (stableFilters.maxScore !== undefined) {
          url += `&maxScore=${stableFilters.maxScore}`;
        }
      }

      const response = await axios.get(url);
      setDatasets(response.data);
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
      toast.error(t('imageDatasets.fetchFailed', { defaultValue: '獲取資料集失敗' }));
    } finally {
      setLoading(false);
    }
  }, [projectId, page, pageSize, stableFilters, t]);

  // 刪除資料集
  const deleteDataset = useCallback(
    async datasetId => {
      try {
        await axios.delete(`/api/projects/${projectId}/image-datasets/${datasetId}`);
        toast.success(t('imageDatasets.deleteSuccess', { defaultValue: '刪除成功' }));
        fetchDatasets();
      } catch (error) {
        console.error('Failed to delete dataset:', error);
        toast.error(t('imageDatasets.deleteFailed', { defaultValue: '刪除失敗' }));
      }
    },
    [projectId, fetchDatasets, t]
  );

  useEffect(() => {
    if (projectId) {
      fetchDatasets();
    }
  }, [projectId, page, stableFilters, fetchDatasets]);

  return {
    datasets,
    loading,
    page,
    setPage,
    pageSize,
    fetchDatasets,
    deleteDataset
  };
}
