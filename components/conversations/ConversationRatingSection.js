'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Divider, Paper, TextField } from '@mui/material';
import { toast } from 'sonner';
import StarRating from '@/components/datasets/StarRating';
import TagSelector from '@/components/datasets/TagSelector';
import NoteInput from '@/components/datasets/NoteInput';
import { useTranslation } from 'react-i18next';

/**
 * 多輪對話評分、標籤、備註綜合元件
 */
export default function ConversationRatingSection({ conversation, projectId, onUpdate }) {
  const { t } = useTranslation();
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);

  // 解析對話中的標籤
  const parseConversationTags = tagsString => {
    try {
      if (typeof tagsString === 'string' && tagsString.trim()) {
        return tagsString.split(/\s+/).filter(tag => tag.length > 0);
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  // 本地狀態管理
  const [localScore, setLocalScore] = useState(conversation.score || 0);
  const [localTags, setLocalTags] = useState(() => parseConversationTags(conversation.tags));
  const [localNote, setLocalNote] = useState(conversation.note || '');

  // 獲取專案中已使用的標籤
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/dataset-conversations/tags`);
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error('獲取可用標籤失敗:', error);
      }
    };

    if (projectId) {
      fetchAvailableTags();
    }
  }, [projectId]);

  // 同步props中的conversation到本地狀態
  useEffect(() => {
    setLocalScore(conversation.score || 0);
    setLocalTags(parseConversationTags(conversation.tags));
    setLocalNote(conversation.note || '');
  }, [conversation]);

  // 更新對話元資料
  const updateMetadata = async updates => {
    if (loading) return;

    // 立即更新本地狀態
    if (updates.score !== undefined) {
      setLocalScore(updates.score);
    }
    if (updates.tagsArray !== undefined) {
      setLocalTags(updates.tagsArray);
    }
    if (updates.note !== undefined) {
      setLocalNote(updates.note);
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/dataset-conversations/${conversation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          score: updates.score,
          tags: updates.tags,
          note: updates.note
        })
      });

      if (!response.ok) {
        throw new Error(t('datasets.saveFailed'));
      }

      const result = await response.json();
      toast.success(t('datasets.saveSuccess'));

      // 如果有父元件的更新回撥，呼叫它
      if (onUpdate) {
        onUpdate(result.data);
      }
    } catch (error) {
      console.error('更新對話元資料失敗:', error);
      toast.error(error.message || t('datasets.saveFailed'));

      // 出錯時恢復本地狀態
      if (updates.score !== undefined) {
        setLocalScore(conversation.score || 0);
      }
      if (updates.tagsArray !== undefined) {
        setLocalTags(parseConversationTags(conversation.tags));
      }
      if (updates.note !== undefined) {
        setLocalNote(conversation.note || '');
      }
    } finally {
      setLoading(false);
    }
  };

  // 處理評分變更
  const handleScoreChange = newScore => {
    updateMetadata({ score: newScore });
  };

  // 處理標籤變更
  const handleTagsChange = newTags => {
    const tagsString = Array.isArray(newTags) ? newTags.join(' ') : '';
    updateMetadata({ tags: tagsString, tagsArray: newTags });
  };

  // 處理備註變更
  const handleNoteChange = newNote => {
    updateMetadata({ note: newNote });
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      {/* 評分割槽域 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          {t('datasets.rating')}
        </Typography>
        <StarRating value={localScore} onChange={handleScoreChange} readOnly={loading} />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 標籤區域 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          {t('datasets.customTags')}
        </Typography>
        <TagSelector
          value={localTags}
          onChange={handleTagsChange}
          availableTags={availableTags}
          readOnly={loading}
          placeholder={t('datasets.addCustomTag', '新增自定義標籤...')}
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 備註區域 */}
      <NoteInput
        value={localNote}
        onChange={handleNoteChange}
        readOnly={loading}
        placeholder={t('datasets.addNote', '新增備註...')}
      />

      <Divider sx={{ my: 2 }} />

      {/* 確認狀態 */}
      {/* <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {t('datasets.confirmationStatus')}
        </Typography>
        <Typography variant="body2">
          {conversation.confirmed ? t('datasets.confirmed') : t('datasets.unconfirmed')}
        </Typography>
      </Box> */}

      {/* AI評估 */}
      {conversation.aiEvaluation && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('datasets.aiEvaluation')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {conversation.aiEvaluation}
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
}
