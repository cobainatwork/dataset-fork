'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * 評估資料集匯出 Hook
 * 管理匯出對話方塊狀態、篩選條件和匯出邏輯
 */
export default function useExportEvalDatasets(projectId, stats = {}) {
  // 對話方塊狀態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // 匯出配置
  const [format, setFormat] = useState('json');
  const [questionTypes, setQuestionTypes] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [keyword, setKeyword] = useState('');

  // 預覽資料
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 從 stats 中獲取可用的標籤列表
  const availableTags = stats?.byTag ? Object.keys(stats.byTag).sort() : [];

  // 當篩選條件變化時，獲取預覽數量
  useEffect(() => {
    if (!dialogOpen || !projectId) return;

    const controller = new AbortController();

    const fetchPreview = async () => {
      try {
        setPreviewLoading(true);
        const params = new URLSearchParams();

        if (questionTypes.length > 0) {
          questionTypes.forEach(t => params.append('questionTypes', t));
        }
        if (selectedTags.length > 0) {
          selectedTags.forEach(t => params.append('tags', t));
        }
        if (keyword.trim()) {
          params.append('keyword', keyword.trim());
        }

        const response = await fetch(`/api/projects/${projectId}/eval-datasets/export?${params.toString()}`, {
          signal: controller.signal
        });

        if (response.ok) {
          const result = await response.json();
          setPreviewTotal(result?.data?.total ?? 0);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('獲取匯出預覽失敗:', err);
        }
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreview();

    return () => {
      controller.abort();
    };
  }, [dialogOpen, projectId, questionTypes, selectedTags, keyword]);

  // 開啟對話方塊
  const openDialog = useCallback(() => {
    setDialogOpen(true);
    setError('');
  }, []);

  // 關閉對話方塊
  const closeDialog = useCallback(() => {
    if (exporting) return;
    setDialogOpen(false);
    // 重置狀態
    setFormat('json');
    setQuestionTypes([]);
    setSelectedTags([]);
    setKeyword('');
    setError('');
  }, [exporting]);

  // 重置篩選條件
  const resetFilters = useCallback(() => {
    setQuestionTypes([]);
    setSelectedTags([]);
    setKeyword('');
  }, []);

  // 執行匯出
  const handleExport = useCallback(async () => {
    if (previewTotal === 0) {
      setError('沒有符合條件的資料可匯出');
      return;
    }

    try {
      setExporting(true);
      setError('');

      const response = await fetch(`/api/projects/${projectId}/eval-datasets/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          questionTypes,
          tags: selectedTags,
          keyword: keyword.trim()
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '匯出失敗');
      }

      // 獲取檔名
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `eval-datasets-${Date.now()}.${format}`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // 下載檔案
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // 匯出成功，關閉對話方塊
      closeDialog();

      return true;
    } catch (err) {
      console.error('匯出失敗:', err);
      setError(err.message || '匯出失敗');
      return false;
    } finally {
      setExporting(false);
    }
  }, [projectId, format, questionTypes, selectedTags, keyword, previewTotal, closeDialog]);

  return {
    // 對話方塊狀態
    dialogOpen,
    openDialog,
    closeDialog,

    // 匯出狀態
    exporting,
    error,
    setError,

    // 匯出配置
    format,
    setFormat,
    questionTypes,
    setQuestionTypes,
    selectedTags,
    setSelectedTags,
    keyword,
    setKeyword,

    // 預覽資料
    previewTotal,
    previewLoading,
    availableTags,

    // 操作
    resetFilters,
    handleExport
  };
}
