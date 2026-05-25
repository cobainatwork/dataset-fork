'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Divider, Paper } from '@mui/material';
import { toast } from 'sonner';
import StarRating from '@/components/datasets/StarRating';
import TagSelector from '@/components/datasets/TagSelector';
import NoteInput from '@/components/datasets/NoteInput';
import { useTranslation } from 'react-i18next';

export default function MetadataEditor({ dataset, projectId, onUpdate }) {
  const { t } = useTranslation();
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);

  // 解析資料集中的標籤
  const parseDatasetTags = tagsString => {
    try {
      return JSON.parse(tagsString || '[]');
    } catch (e) {
      return [];
    }
  };

  // 本地狀態管理，從 props 初始化
  const [localScore, setLocalScore] = useState(dataset?.score || 0);
  const [localTags, setLocalTags] = useState(() => {
    const tags = parseDatasetTags(dataset?.tags);
    // 確保 localTags 始終是陣列
    return Array.isArray(tags) ? tags : [];
  });
  const [localNote, setLocalNote] = useState(dataset?.note || '');

  // 獲取專案中已使用的標籤
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/image-datasets/tags`);
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

  // 同步props中的dataset到本地狀態
  useEffect(() => {
    if (dataset) {
      setLocalScore(dataset.score || 0);
      const tags = parseDatasetTags(dataset.tags);
      setLocalTags(Array.isArray(tags) ? tags : []);
      setLocalNote(dataset.note || '');
    }
  }, [dataset]);

  // 更新資料集元資料
  const updateMetadata = async updates => {
    if (loading) return;

    // 立即更新本地狀態，提升響應速度
    if (updates.score !== undefined) {
      setLocalScore(updates.score);
    }
    // 注意：tags 已經在 handleTagsChange 中更新過了，這裡不需要再更新
    if (updates.note !== undefined) {
      setLocalNote(updates.note);
    }

    setLoading(true);
    try {
      // 呼叫父元件的更新方法
      if (onUpdate) {
        await onUpdate(updates);
      }
      toast.success(t('imageDatasets.updateSuccess', '更新成功'));
    } catch (error) {
      console.error('更新資料集元資料失敗:', error);
      toast.error(t('imageDatasets.updateFailed', '更新失敗'));

      // 出錯時恢復本地狀態
      if (updates.score !== undefined) {
        setLocalScore(dataset?.score || 0);
      }
      if (updates.tags !== undefined) {
        // 恢復為原始的標籤陣列
        const tags = parseDatasetTags(dataset?.tags);
        setLocalTags(Array.isArray(tags) ? tags : []);
      }
      if (updates.note !== undefined) {
        setLocalNote(dataset?.note || '');
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
    // 立即更新本地狀態（保持為陣列）
    setLocalTags(newTags);
    // 傳送給父元件時轉換為 JSON 字串
    updateMetadata({ tags: JSON.stringify(newTags) });
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
          {t('datasets.rating', '評分')}
        </Typography>
        <StarRating value={localScore} onChange={handleScoreChange} readOnly={loading} />
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* 標籤區域 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          {t('datasets.customTags', '自定義標籤')}
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
    </Paper>
  );
}
