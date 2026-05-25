'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 評估任務列表 Hook
 */
export default function useEvalTasks(projectId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [total, setTotal] = useState(0);

  // 載入任務列表
  const loadTasks = useCallback(
    async (isRefresh = false) => {
      if (!projectId) return;

      try {
        if (!isRefresh) setLoading(true);
        setError('');
        const response = await fetch(`/api/projects/${projectId}/eval-tasks?page=${page}&pageSize=${pageSize}`);
        const result = await response.json();

        if (result.code === 0) {
          setTasks(result.data.items || []);
          setTotal(result.data.total || 0);
        } else {
          setError(result.error || '載入失敗');
        }
      } catch (err) {
        console.error('載入評估任務失敗:', err);
        setError('載入失敗');
      } finally {
        if (!isRefresh) setLoading(false);
      }
    },
    [projectId, page, pageSize]
  );

  // 初始載入和分頁變化載入
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // 自動重新整理進行中的任務
  useEffect(() => {
    const hasProcessingTasks = tasks.some(t => t.status === 0);
    if (!hasProcessingTasks) return;

    const interval = setInterval(() => loadTasks(true), 5000);
    return () => clearInterval(interval);
  }, [tasks, loadTasks]);

  // 刪除任務
  const deleteTask = useCallback(
    async taskId => {
      try {
        const response = await fetch(`/api/projects/${projectId}/eval-tasks/${taskId}`, {
          method: 'DELETE'
        });
        const result = await response.json();

        if (result.code === 0) {
          loadTasks();
          return true;
        } else {
          setError(result.error || '刪除失敗');
          return false;
        }
      } catch (err) {
        console.error('刪除任務失敗:', err);
        setError('刪除失敗');
        return false;
      }
    },
    [projectId]
  );

  // 中斷任務
  const interruptTask = useCallback(
    async taskId => {
      try {
        const response = await fetch(`/api/projects/${projectId}/eval-tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'interrupt' })
        });
        const result = await response.json();

        if (result.code === 0) {
          loadTasks();
          return true;
        } else {
          setError(result.error || '中斷失敗');
          return false;
        }
      } catch (err) {
        console.error('中斷任務失敗:', err);
        setError('中斷失敗');
        return false;
      }
    },
    [projectId, loadTasks]
  );

  // 建立任務
  const createTasks = useCallback(
    async data => {
      try {
        const response = await fetch(`/api/projects/${projectId}/eval-tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.code === 0) {
          loadTasks();
          return { success: true, data: result.data };
        } else {
          return { success: false, error: result.error };
        }
      } catch (err) {
        console.error('建立任務失敗:', err);
        return { success: false, error: '建立失敗' };
      }
    },
    [projectId, loadTasks]
  );

  return {
    tasks,
    loading,
    error,
    setError,
    loadTasks,
    deleteTask,
    interruptTask,
    createTasks,
    page,
    setPage,
    pageSize,
    setPageSize,
    total
  };
}
