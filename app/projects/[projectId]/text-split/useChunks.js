'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

/**
 * 文字塊管理的自定義Hook
 * @param {string} projectId - 專案ID
 * @param {string} [currentFilter='all'] - 當前篩選條件
 * @returns {Object} - 文字塊狀態和操作方法
 */
export default function useChunks(projectId, currentFilter = 'all') {
  const { t } = useTranslation();
  const [chunks, setChunks] = useState([]);
  const [tocData, setTocData] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * 獲取文字塊列表
   * @param {string} filter - 篩選條件
   */
  const fetchChunks = useCallback(
    async (filter = 'all') => {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/split?filter=${filter}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('textSplit.fetchChunksFailed'));
        }

        const data = await response.json();
        setChunks(data.chunks || []);

        // 如果有檔案結果，處理詳細資訊
        if (data.toc) {
          console.log(t('textSplit.fileResultReceived'), data.fileResult);
          // 如果有目錄結構，設定目錄資料
          setTocData(data.toc);
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [projectId, t, setLoading, setChunks, setTocData]
  );

  /**
   * 處理刪除文字塊
   * @param {string} chunkId - 文字塊ID
   */
  const handleDeleteChunk = useCallback(
    async chunkId => {
      try {
        const response = await fetch(`/api/projects/${projectId}/chunks/${encodeURIComponent(chunkId)}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('textSplit.deleteChunkFailed'));
        }

        // 更新文字塊列表
        setChunks(prev => prev.filter(chunk => chunk.id !== chunkId));
      } catch (error) {
        toast.error(error.message);
      }
    },
    [projectId, t]
  );

  /**
   * 處理文字塊編輯
   * @param {string} chunkId - 文字塊ID
   * @param {string} newContent - 新內容
   */
  const handleEditChunk = useCallback(
    async (chunkId, newContent) => {
      try {
        setLoading(true);

        const response = await fetch(`/api/projects/${projectId}/chunks/${encodeURIComponent(chunkId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content: newContent })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || t('textSplit.editChunkFailed'));
        }

        // 更新成功後使用當前篩選條件重新整理文字塊列表
        // 直接從 URL 獲取當前篩選引數，確保獲取到的是最新的值
        const url = new URL(window.location.href);
        const filterParam = url.searchParams.get('filter') || 'all';
        await fetchChunks(filterParam);

        toast.success(t('textSplit.editChunkSuccess'));
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [projectId, t, fetchChunks]
  );

  /**
   * 設定文字塊列表
   * @param {Array} data - 新的文字塊列表
   */
  const updateChunks = useCallback(data => {
    setChunks(data);
  }, []);

  /**
   * 新增新的文字塊
   * @param {Array} newChunks - 新的文字塊列表
   */
  const addChunks = useCallback(newChunks => {
    setChunks(prev => {
      const updatedChunks = [...prev];
      newChunks.forEach(chunk => {
        if (!updatedChunks.find(c => c.id === chunk.id)) {
          updatedChunks.push(chunk);
        }
      });
      return updatedChunks;
    });
  }, []);

  /**
   * 設定TOC資料
   * @param {string} toc - TOC資料
   */
  const updateTocData = useCallback(toc => {
    if (toc) {
      setTocData(toc);
    }
  }, []);

  return {
    chunks,
    tocData,
    loading,
    fetchChunks,
    handleDeleteChunk,
    handleEditChunk,
    updateChunks,
    addChunks,
    updateTocData,
    setLoading
  };
}
