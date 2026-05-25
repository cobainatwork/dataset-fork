'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * 多輪對話詳情頁面的狀態管理Hook
 */
export default function useConversationDetails(projectId, conversationId) {
  const { t } = useTranslation();
  const router = useRouter();

  // 基礎狀態
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  // 編輯狀態
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    score: 0,
    tags: '',
    note: '',
    confirmed: false,
    messages: []
  });

  // 對話方塊狀態
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 獲取對話詳情
  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/dataset-conversations/${conversationId}`);

      if (!response.ok) {
        if (response.status === 404) {
          toast.error(t('datasets.conversationNotFound'));
          router.push(`/projects/${projectId}/multi-turn`);
          return;
        }
        throw new Error(t('datasets.fetchDataFailed'));
      }

      const data = await response.json();
      setConversation(data);

      // 解析對話訊息
      let parsedMessages = [];
      try {
        parsedMessages = JSON.parse(data.rawMessages || '[]');
        setMessages(parsedMessages);
      } catch (error) {
        console.error('解析對話訊息失敗:', error);
        setMessages([]);
      }

      // 設定編輯資料
      setEditData({
        score: data.score || 0,
        tags: data.tags || '',
        note: data.note || '',
        confirmed: data.confirmed || false,
        messages: parsedMessages
      });
    } catch (error) {
      console.error('獲取對話詳情失敗:', error);
      toast.error(error.message || t('datasets.fetchDataFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 儲存編輯
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/projects/${projectId}/dataset-conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          score: editData.score,
          tags: editData.tags,
          note: editData.note,
          confirmed: editData.confirmed,
          messages: editData.messages
        })
      });

      if (!response.ok) {
        throw new Error(t('datasets.saveFailed'));
      }

      // 更新本地狀態
      setConversation({ ...conversation, ...editData });
      setMessages(editData.messages);
      setEditMode(false);
      toast.success(t('datasets.saveSuccess'));
    } catch (error) {
      console.error('儲存失敗:', error);
      toast.error(error.message || t('datasets.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  // 開始編輯
  const handleEdit = () => {
    setEditMode(true);
  };

  // 取消編輯
  const handleCancel = () => {
    // 恢復到原始資料
    setEditData({
      score: conversation.score || 0,
      tags: conversation.tags || '',
      note: conversation.note || '',
      confirmed: conversation.confirmed || false,
      messages: messages
    });
    setEditMode(false);
  };

  // 刪除對話
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/dataset-conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(t('datasets.deleteFailed'));
      }

      toast.success(t('datasets.deleteSuccess'));
      router.push(`/projects/${projectId}/multi-turn`);
    } catch (error) {
      console.error('刪除失敗:', error);
      toast.error(error.message || t('datasets.deleteFailed'));
    }
  };

  // 更新訊息內容
  const updateMessageContent = (index, newContent) => {
    const updatedMessages = [...editData.messages];
    updatedMessages[index] = { ...updatedMessages[index], content: newContent };
    setEditData({ ...editData, messages: updatedMessages });
  };

  // 翻頁導航
  const handleNavigate = async direction => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/dataset-conversations/${conversationId}?operateType=${direction}`
      );

      if (!response.ok) {
        throw new Error('獲取導航資料失敗');
      }

      const data = await response.json();

      if (data) {
        router.push(`/projects/${projectId}/multi-turn/${data.id}`);
      } else {
        toast.warning(`已經是${direction === 'next' ? '最後' : '第'}一條對話了`);
      }
    } catch (error) {
      console.error('導航失敗:', error);
      toast.error(error.message || '導航失敗');
    }
  };

  // 初始化
  useEffect(() => {
    fetchConversation();
  }, [projectId, conversationId]);

  return {
    // 資料狀態
    conversation,
    messages,
    loading,

    // 編輯狀態
    editMode,
    saving,
    editData,
    setEditData,

    // 對話方塊狀態
    deleteDialogOpen,
    setDeleteDialogOpen,

    // 操作方法
    handleEdit,
    handleSave,
    handleCancel,
    handleDelete,
    handleNavigate,
    updateMessageContent,
    fetchConversation
  };
}
