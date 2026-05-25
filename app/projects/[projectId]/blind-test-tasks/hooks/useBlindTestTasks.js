'use client';

import { useState, useCallback, useEffect } from 'react';

/**
 * 盲測任務列表管理 Hook
 */
export default function useBlindTestTasks(projectId) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [total, setTotal] = useState(0);

  // 載入任務列表
  const loadTasks = useCallback(
    async (isRefresh = false) => {
      if (!projectId) return;

      try {
        if (!isRefresh) setLoading(true);
        setError('');
        const response = await fetch(`/api/projects/${projectId}/blind-test-tasks?page=${page}&pageSize=${pageSize}`);
        const result = await response.json();

        if (result.code === 0) {
          setTasks(result.data.items || []);
          setTotal(result.data.total || 0);
        } else {
          setError(result.error || '載入失敗');
        }
      } catch (err) {
        console.error('載入盲測任務失敗:', err);
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

  // 刪除任務
  const deleteTask = useCallback(
    async taskId => {
      try {
        const response = await fetch(`/api/projects/${projectId}/blind-test-tasks/${taskId}`, {
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
    [projectId, loadTasks]
  );

  // 中斷任務
  const interruptTask = useCallback(
    async taskId => {
      try {
        const response = await fetch(`/api/projects/${projectId}/blind-test-tasks/${taskId}`, {
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
  const createTask = useCallback(
    async taskData => {
      try {
        const response = await fetch(`/api/projects/${projectId}/blind-test-tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        const result = await response.json();

        if (result.code === 0) {
          loadTasks();
          return { success: true, data: result.data };
        } else {
          return { success: false, error: result.error || '建立失敗' };
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
    createTask,
    page,
    setPage,
    pageSize,
    setPageSize,
    total
  };
}
