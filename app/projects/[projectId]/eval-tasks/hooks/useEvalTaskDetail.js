'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 評估任務詳情 Hook
 */
export default function useEvalTaskDetail(projectId, taskId) {
  const [task, setTask] = useState(null);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 分頁和篩選狀態
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterType, setFilterType] = useState(null);
  const [filterCorrect, setFilterCorrect] = useState(null); // null: all, true: correct, false: incorrect
  const [total, setTotal] = useState(0);

  // 載入任務詳情
  const loadData = useCallback(async () => {
    if (!projectId || !taskId) return;

    try {
      setLoading(true);
      setError('');

      // 構建查詢引數
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      if (filterType) {
        params.append('type', filterType);
      }

      if (filterCorrect !== null) {
        params.append('isCorrect', filterCorrect.toString());
      }

      const response = await fetch(`/api/projects/${projectId}/eval-tasks/${taskId}?${params.toString()}`);
      const result = await response.json();

      if (result.code === 0) {
        setTask(result.data.task);
        setResults(result.data.results || []);
        setTotal(result.data.total || 0);
        setStats(result.data.stats);
      } else {
        setError(result.error || '載入失敗');
      }
    } catch (err) {
      console.error('載入任務詳情失敗:', err);
      setError('載入失敗');
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId, page, pageSize, filterType, filterCorrect]);

  // 初始載入
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 自動重新整理進行中的任務 (僅在第一頁且無篩選時重新整理，避免干擾使用者檢視歷史記錄)
  useEffect(() => {
    if (task?.status !== 0 || page !== 1 || filterType || filterCorrect !== null) return;

    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [task?.status, page, filterType, filterCorrect, loadData]);

  return {
    task,
    results,
    stats,
    total,
    page,
    setPage,
    pageSize,
    setPageSize,
    filterType,
    setFilterType,
    filterCorrect,
    setFilterCorrect,
    loading,
    error,
    setError,
    loadData
  };
}
