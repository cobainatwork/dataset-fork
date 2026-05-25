'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';

export function useQuestionDelete(projectId, onDeleteSuccess) {
  const { t } = useTranslation();

  // 確認對話方塊狀態
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    content: '',
    confirmAction: null
  });

  // 執行單個問題刪除
  const executeDeleteQuestion = async (questionId, selectedQuestions, setSelectedQuestions) => {
    toast.promise(axios.delete(`/api/projects/${projectId}/questions/${questionId}`), {
      loading: '資料刪除中',
      success: data => {
        // 更新選中狀態
        setSelectedQuestions(prev => (prev.includes(questionId) ? prev.filter(id => id !== questionId) : prev));
        // 呼叫成功回撥
        if (onDeleteSuccess) {
          onDeleteSuccess();
        }
        return t('common.deleteSuccess');
      },
      error: error => {
        return error.response?.data?.message || '刪除失敗';
      }
    });
  };

  // 確認刪除單個問題
  const confirmDeleteQuestion = (questionId, selectedQuestions, setSelectedQuestions) => {
    setConfirmDialog({
      open: true,
      title: t('common.confirmDelete'),
      content: t('common.confirmDeleteQuestion'),
      confirmAction: () => executeDeleteQuestion(questionId, selectedQuestions, setSelectedQuestions)
    });
  };

  // 處理刪除單個問題的入口函式
  const handleDeleteQuestion = (questionId, selectedQuestions, setSelectedQuestions) => {
    confirmDeleteQuestion(questionId, selectedQuestions, setSelectedQuestions);
  };

  // 執行批次刪除問題
  const executeBatchDeleteQuestions = async (selectedQuestions, setSelectedQuestions) => {
    toast.promise(
      axios.delete(`/api/projects/${projectId}/questions/batch-delete`, {
        data: { questionIds: selectedQuestions }
      }),
      {
        loading: `正在刪除 ${selectedQuestions.length} 個問題...`,
        success: data => {
          // 呼叫成功回撥
          if (onDeleteSuccess) {
            onDeleteSuccess();
          }
          // 清空選中狀態
          setSelectedQuestions([]);
          return `成功刪除 ${selectedQuestions.length} 個問題`;
        },
        error: error => {
          return error.response?.data?.message || '批次刪除問題失敗';
        }
      }
    );
  };

  // 確認批次刪除問題
  const confirmBatchDeleteQuestions = (selectedQuestions, setSelectedQuestions) => {
    if (selectedQuestions.length === 0) {
      toast.warning('請先選擇問題');
      return;
    }

    setConfirmDialog({
      open: true,
      title: '確認批次刪除問題',
      content: `您確定要刪除選中的 ${selectedQuestions.length} 個問題嗎？此操作不可恢復。`,
      confirmAction: () => executeBatchDeleteQuestions(selectedQuestions, setSelectedQuestions)
    });
  };

  // 處理批次刪除問題的入口函式
  const handleBatchDeleteQuestions = (selectedQuestions, setSelectedQuestions) => {
    confirmBatchDeleteQuestions(selectedQuestions, setSelectedQuestions);
  };

  // 關閉確認對話方塊
  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      title: '',
      content: '',
      confirmAction: null
    });
  };

  // 確認對話方塊的確認操作
  const handleConfirmAction = () => {
    closeConfirmDialog();
    if (confirmDialog.confirmAction) {
      confirmDialog.confirmAction();
    }
  };

  return {
    // 狀態
    confirmDialog,

    // 方法
    handleDeleteQuestion,
    handleBatchDeleteQuestions,
    closeConfirmDialog,
    handleConfirmAction
  };
}
