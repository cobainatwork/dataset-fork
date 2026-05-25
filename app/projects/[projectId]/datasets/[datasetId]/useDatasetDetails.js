'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAtomValue } from 'jotai/index';
import { selectedModelInfoAtom } from '@/lib/store';
import axios from 'axios';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';

/**
 * 資料集詳情頁面業務邏輯 Hook
 */
export default function useDatasetDetails(projectId, datasetId) {
  const router = useRouter();
  const [datasets, setDatasets] = useState([]);
  const [currentDataset, setCurrentDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [editingCot, setEditingCot] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [answerValue, setAnswerValue] = useState('');
  const [cotValue, setCotValue] = useState('');
  const [questionValue, setQuestionValue] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [confirming, setConfirming] = useState(false);
  const [unconfirming, setUnconfirming] = useState(false);
  const [optimizeDialog, setOptimizeDialog] = useState({
    open: false,
    loading: false
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewChunk, setViewChunk] = useState(null);
  const [datasetsAllCount, setDatasetsAllCount] = useState(0);
  const [datasetsConfirmCount, setDatasetsConfirmCount] = useState(0);
  const [answerTokens, setAnswerTokens] = useState(0);
  const [cotTokens, setCotTokens] = useState(0);
  const model = useAtomValue(selectedModelInfoAtom);
  const [shortcutsEnabled, setShortcutsEnabled] = useState(() => {
    const storedValue = localStorage.getItem('shortcutsEnabled');
    return storedValue !== null ? storedValue === 'true' : false;
  });

  // 輸入環境判斷，避免在輸入框/可編輯區域誤觸快捷鍵
  const isEditableTarget = el => {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase();
    if (tag && ['input', 'textarea', 'select'].includes(tag)) return true;
    if (el.isContentEditable) return true;
    // 相容巢狀的可編輯區域與常見富文字編輯器
    return !!el.closest?.('[contenteditable="true"], .ProseMirror, .ql-editor');
  };

  // 簡單節流，避免連續觸發
  const lastShortcutRef = useRef(0);

  // 非同步獲取Token數量
  const fetchTokenCount = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets/${datasetId}/token-count`);
      if (response.ok) {
        const data = await response.json();
        if (data.answerTokens !== undefined) {
          setAnswerTokens(data.answerTokens);
        }
        if (data.cotTokens !== undefined) {
          setCotTokens(data.cotTokens);
        }
      }
    } catch (error) {
      console.error('獲取Token數量失敗:', error);
      // Token載入失敗不阻塞主介面或顯示錯誤提示
    }
  };

  // 獲取資料集詳情
  const fetchDatasets = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets/${datasetId}`);
      if (!response.ok) throw new Error('獲取資料集詳情失敗');
      const data = await response.json();
      setCurrentDataset(data.datasets);
      setCotValue(data.datasets?.cot);
      setAnswerValue(data.datasets?.answer);
      setQuestionValue(data.datasets?.question);
      setDatasetsAllCount(data.total);
      setDatasetsConfirmCount(data.confirmedCount);

      // 資料載入完成後，非同步獲取Token數量
      fetchTokenCount();
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // 確認並儲存資料集
  const handleConfirm = async () => {
    try {
      setConfirming(true);
      const response = await fetch(`/api/projects/${projectId}/datasets?id=${datasetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmed: true
        })
      });

      if (!response.ok) {
        throw new Error('操作失敗');
      }

      setCurrentDataset(prev => ({ ...prev, confirmed: true }));

      setSnackbar({
        open: true,
        message: '操作成功',
        severity: 'success'
      });

      // 導航到下一個資料集
      handleNavigate('next');
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || '操作失敗',
        severity: 'error'
      });
    } finally {
      setConfirming(false);
    }
  };

  // 取消確認資料集
  const handleUnconfirm = async () => {
    try {
      setUnconfirming(true);
      const response = await fetch(`/api/projects/${projectId}/datasets?id=${datasetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmed: false
        })
      });

      if (!response.ok) {
        throw new Error('操作失敗');
      }

      setCurrentDataset(prev => ({ ...prev, confirmed: false }));

      setSnackbar({
        open: true,
        message: '已取消確認',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || '取消確認失敗',
        severity: 'error'
      });
    } finally {
      setUnconfirming(false);
    }
  };

  const buildNavigationParams = direction => {
    const params = new URLSearchParams({ operateType: direction });

    // Apply active list filters so navigation stays within the filtered set
    try {
      const savedFilters = localStorage.getItem(`datasets-filters-${projectId}`);
      if (savedFilters) {
        const {
          filterConfirmed,
          filterChunkName,
          filterHasCot,
          filterIsDistill,
          filterScoreRange,
          filterCustomTag,
          filterNoteKeyword,
          searchQuery,
          searchField
        } = JSON.parse(savedFilters);

        if (filterConfirmed === 'confirmed') params.set('status', 'confirmed');
        else if (filterConfirmed === 'unconfirmed') params.set('status', 'unconfirmed');

        if (filterChunkName) params.set('chunkName', filterChunkName);
        if (filterHasCot && filterHasCot !== 'all') params.set('hasCot', filterHasCot);
        if (filterIsDistill && filterIsDistill !== 'all') params.set('isDistill', filterIsDistill);
        if (filterScoreRange && (filterScoreRange[0] > 0 || filterScoreRange[1] < 5)) {
          params.set('scoreRange', `${filterScoreRange[0]}-${filterScoreRange[1]}`);
        }
        if (filterCustomTag) params.set('customTag', filterCustomTag);
        if (filterNoteKeyword) params.set('noteKeyword', filterNoteKeyword);
        if (searchQuery) {
          params.set('input', searchQuery);
          params.set('field', searchField || 'question');
        }
      }
    } catch (e) {
      console.error('Failed to read filter conditions for navigation:', e);
    }

    return params;
  };

  // 導航到其他資料集
  const handleNavigate = async direction => {
    const params = buildNavigationParams(direction);
    const response = await axios.get(`/api/projects/${projectId}/datasets/${datasetId}?${params}`);
    if (response.data) {
      router.push(`/projects/${projectId}/datasets/${response.data.id}`);
    } else {
      toast.warning(`已經是${direction === 'next' ? '最後' : '第'}一條資料了`);
    }
  };

  // 儲存編輯
  const handleSave = async (field, value) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets?id=${datasetId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [field]: value
        })
      });

      if (!response.ok) {
        throw new Error('儲存失敗');
      }

      const data = await response.json();
      setCurrentDataset(prev => ({ ...prev, [field]: value }));

      setSnackbar({
        open: true,
        message: '儲存成功',
        severity: 'success'
      });

      // 重置編輯狀態
      if (field === 'answer') setEditingAnswer(false);
      if (field === 'cot') setEditingCot(false);
      if (field === 'question') setEditingQuestion(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || '儲存失敗',
        severity: 'error'
      });
    }
  };

  // 刪除資料集
  const handleDelete = async () => {
    if (!confirm('確定要刪除這條資料嗎？此操作不可撤銷。')) return;

    try {
      // 嘗試獲取下一個資料集，在刪除前先確保有可導航的目標
      const params = buildNavigationParams('next');
      const nextResponse = await axios.get(`/api/projects/${projectId}/datasets/${datasetId}?${params}`);
      const hasNextDataset = !!nextResponse.data;
      const nextDatasetId = hasNextDataset ? nextResponse.data.id : null;

      // 刪除當前資料集
      const deleteResponse = await fetch(`/api/projects/${projectId}/datasets?id=${datasetId}`, {
        method: 'DELETE'
      });

      if (!deleteResponse.ok) {
        throw new Error('刪除失敗');
      }

      // 導航邏輯：有下一個就跳轉下一個，沒有則返回列表頁
      if (hasNextDataset) {
        router.push(`/projects/${projectId}/datasets/${nextDatasetId}`);
      } else {
        // 沒有更多資料集，返回列表頁面
        router.push(`/projects/${projectId}/datasets`);
      }

      toast.success('刪除成功');
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || '刪除失敗',
        severity: 'error'
      });
    }
  };

  // 最佳化對話方塊相關操作
  const handleOpenOptimizeDialog = () => {
    setOptimizeDialog({
      open: true,
      loading: false
    });
  };

  const handleCloseOptimizeDialog = () => {
    setOptimizeDialog(prev => {
      // 如果正在最佳化，不允許關閉
      if (prev.loading) {
        return prev;
      }
      return {
        open: false,
        loading: false
      };
    });
  };

  // 最佳化操作
  const handleOptimize = async advice => {
    if (!model) {
      setSnackbar({
        open: true,
        message: '請先選擇模型，可以在頂部導航欄選擇',
        severity: 'error'
      });
      return;
    }

    // 立即關閉對話方塊，並設定最佳化中狀態
    setOptimizeDialog(prev => {
      const newState = {
        open: false,
        loading: true
      };
      return newState;
    });

    toast.info('已開始最佳化，請稍候...');

    // 非同步後臺處理，不等待結果
    (async () => {
      try {
        const language = i18n.language;
        const response = await fetch(`/api/projects/${projectId}/datasets/optimize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            datasetId,
            model,
            advice,
            language
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '最佳化失敗');
        }

        // 最佳化成功後，重新查詢資料以獲取最新狀態
        await fetchDatasets();
        // 最佳化可能改變了文字內容，重新獲取Token計數
        fetchTokenCount();

        toast.success('AI智慧最佳化成功');
      } catch (error) {
        toast.error(error.message);
      } finally {
        setOptimizeDialog({
          open: false,
          loading: false
        });
      }
    })();
  };

  // 檢視文字塊詳情
  const handleViewChunk = async chunkContent => {
    try {
      setViewChunk(chunkContent);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('檢視文字塊出錯', error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: 'error'
      });
      setViewDialogOpen(false);
    }
  };

  // 關閉文字塊詳情對話方塊
  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
  };

  // 初始化和快捷鍵事件
  useEffect(() => {
    fetchDatasets();
  }, [projectId, datasetId]);

  // 快捷鍵狀態變化
  useEffect(() => {
    localStorage.setItem('shortcutsEnabled', shortcutsEnabled);
  }, [shortcutsEnabled]);

  // 監聽鍵盤事件
  useEffect(() => {
    const handleKeyDown = event => {
      if (!shortcutsEnabled) return;

      // 在輸入框或可編輯區域時不觸發
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      if (isEditableTarget(event.target) || isEditableTarget(activeEl)) {
        return;
      }

      // 僅要求 Shift 修飾鍵，降低誤觸且更簡單
      if (!event.shiftKey) return;

      // 簡單節流，過濾極短時間內重複觸發
      const now = Date.now();
      if (now - (lastShortcutRef.current || 0) < 250) {
        return;
      }
      lastShortcutRef.current = now;

      switch (event.key) {
        case 'ArrowLeft': // 上一個（Shift + ArrowLeft）
          event.preventDefault();
          handleNavigate('prev');
          break;
        case 'ArrowRight': // 下一個（Shift + ArrowRight）
          event.preventDefault();
          handleNavigate('next');
          break;
        case 'y': // 確認（Shift + Y）
        case 'Y':
          if (!confirming && currentDataset && !currentDataset.confirmed) {
            event.preventDefault();
            handleConfirm();
          }
          break;
        case 'd': // 刪除（Shift + D）
        case 'D':
          event.preventDefault();
          handleDelete();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcutsEnabled, confirming, currentDataset]);

  return {
    loading,
    currentDataset,
    answerValue,
    cotValue,
    questionValue,
    editingAnswer,
    editingCot,
    editingQuestion,
    confirming,
    unconfirming,
    snackbar,
    optimizeDialog,
    viewDialogOpen,
    viewChunk,
    datasetsAllCount,
    datasetsConfirmCount,
    answerTokens,
    cotTokens,
    shortcutsEnabled,
    setShortcutsEnabled,
    setSnackbar,
    setAnswerValue,
    setCotValue,
    setQuestionValue,
    setEditingAnswer,
    setEditingCot,
    setEditingQuestion,
    handleNavigate,
    handleConfirm,
    handleUnconfirm,
    handleSave,
    handleDelete,
    handleOpenOptimizeDialog,
    handleCloseOptimizeDialog,
    handleOptimize,
    handleViewChunk,
    handleCloseViewDialog
  };
}
