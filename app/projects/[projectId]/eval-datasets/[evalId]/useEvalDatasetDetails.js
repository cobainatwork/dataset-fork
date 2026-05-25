'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import axios from 'axios';

export default function useEvalDatasetDetails(projectId, evalId) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 編輯狀態
  const [editingField, setEditingField] = useState(null); // 'question', 'options', 'correctAnswer', 'note', 'tags'
  const [fieldValue, setFieldValue] = useState('');
  // 獲取詳情
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/projects/${projectId}/eval-datasets/${evalId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('未找到該題目');
        }
        throw new Error('獲取資料失敗');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, evalId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 導航
  const handleNavigate = async direction => {
    try {
      const response = await fetch(`/api/projects/${projectId}/eval-datasets/${evalId}?operateType=${direction}`);
      if (response.ok) {
        const neighbor = await response.json();
        if (neighbor && neighbor.id) {
          router.push(`/projects/${projectId}/eval-datasets/${neighbor.id}`);
        } else {
          toast.warning(`已經是${direction === 'next' ? '最後' : '第'}一條資料了`);
        }
      }
    } catch (err) {
      console.error('Navigation error:', err);
    }
  };

  // 開始編輯
  const handleStartEdit = (field, value) => {
    setEditingField(field);
    // 對於 options，如果是陣列則轉為 JSON 字串編輯，或者在元件層面處理
    // 這裡假設 value 已經是適合編輯的格式
    setFieldValue(value);
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setEditingField(null);
    setFieldValue('');
  };

  // 儲存編輯
  const handleSave = async (field, value) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/eval-datasets/${evalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });

      if (!response.ok) throw new Error('儲存失敗');

      const updated = await response.json();
      setData(prev => ({ ...prev, ...updated })); // 更新本地資料
      setEditingField(null);
      toast.success('儲存成功');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // 刪除
  const handleDelete = async () => {
    if (!confirm('確定要刪除這條資料嗎？此操作不可撤銷。')) return;

    try {
      // 先嚐試獲取下一條，以便刪除後跳轉
      const nextResponse = await fetch(`/api/projects/${projectId}/eval-datasets/${evalId}?operateType=next`);
      let nextId = null;
      if (nextResponse.ok) {
        const next = await nextResponse.json();
        if (next && next.id) nextId = next.id;
      }

      // 如果沒有下一條，嘗試獲取上一條
      if (!nextId) {
        const prevResponse = await fetch(`/api/projects/${projectId}/eval-datasets/${evalId}?operateType=prev`);
        if (prevResponse.ok) {
          const prev = await prevResponse.json();
          if (prev && prev.id) nextId = prev.id;
        }
      }

      // 刪除
      const deleteResponse = await fetch(`/api/projects/${projectId}/eval-datasets/${evalId}`, {
        method: 'DELETE'
      });

      if (!deleteResponse.ok) throw new Error('刪除失敗');

      toast.success('刪除成功');

      if (nextId) {
        router.replace(`/projects/${projectId}/eval-datasets/${nextId}`);
      } else {
        router.push(`/projects/${projectId}/eval-datasets`);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };
  return {
    data,
    loading,
    error,
    editingField,
    fieldValue,
    setFieldValue,
    handleNavigate,
    handleStartEdit,
    handleCancelEdit,
    handleSave,
    handleDelete
  };
}
