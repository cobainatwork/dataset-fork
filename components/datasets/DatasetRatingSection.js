'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Divider, Paper, Button, Stack } from '@mui/material';
import { toast } from 'sonner';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import StarRating from './StarRating';
import TagSelector from './TagSelector';
import NoteInput from './NoteInput';
import EvalVariantDialog from './EvalVariantDialog';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { selectedModelInfoAtom } from '@/lib/store';

/**
 * 資料集評分、標籤、備註綜合元件
 */
export default function DatasetRatingSection({ dataset, projectId, onUpdate, currentDataset }) {
  const { t, i18n } = useTranslation();
  const [availableTags, setAvailableTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingToEval, setAddingToEval] = useState(false);
  const [generatingVariant, setGeneratingVariant] = useState(false);
  const [variantDialog, setVariantDialog] = useState({
    open: false,
    data: null
  });

  const selectedModel = useAtomValue(selectedModelInfoAtom);

  // 解析資料集中的標籤
  const parseDatasetTags = tagsString => {
    try {
      return JSON.parse(tagsString || '[]');
    } catch (e) {
      return [];
    }
  };

  // 本地狀態管理，從 props 初始化
  const [localScore, setLocalScore] = useState(dataset.score || 0);
  const [localTags, setLocalTags] = useState(() => parseDatasetTags(dataset.tags));
  const [localNote, setLocalNote] = useState(dataset.note || '');

  // 獲取專案中已使用的標籤
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/datasets/tags`);
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
    setLocalScore(dataset.score || 0);
    setLocalTags(parseDatasetTags(dataset.tags));
    setLocalNote(dataset.note || '');
  }, [dataset]);

  // 更新資料集元資料
  const updateMetadata = async updates => {
    if (loading) return;

    // 立即更新本地狀態，提升響應速度
    if (updates.score !== undefined) {
      setLocalScore(updates.score);
    }
    if (updates.tags !== undefined) {
      setLocalTags(updates.tags);
    }
    if (updates.note !== undefined) {
      setLocalNote(updates.note);
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets/${dataset.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('更新失敗');
      }

      const result = await response.json();

      // 顯示成功提示
      toast.success(t('datasets.updateSuccess', '更新成功'));

      // 如果有父元件的更新回撥，呼叫它
      if (onUpdate) {
        onUpdate(result.dataset);
      }
    } catch (error) {
      console.error('更新資料集元資料失敗:', error);
      // 顯示錯誤提示
      toast.error(t('datasets.updateFailed', '更新失敗'));

      // 出錯時恢復本地狀態
      if (updates.score !== undefined) {
        setLocalScore(dataset.score || 0);
      }
      if (updates.tags !== undefined) {
        setLocalTags(parseDatasetTags(dataset.tags));
      }
      if (updates.note !== undefined) {
        setLocalNote(dataset.note || '');
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
    updateMetadata({ tags: newTags });
  };

  // 處理備註變更
  const handleNoteChange = newNote => {
    updateMetadata({ note: newNote });
  };

  // 新增到評估資料集
  const handleAddToEval = async () => {
    if (addingToEval) return;

    setAddingToEval(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/datasets/${dataset.id}/copy-to-eval`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to add to eval dataset');
      }

      toast.success(t('datasets.addToEvalSuccess', '成功新增到評估資料集'));

      // 更新本地標籤顯示
      const currentTags = localTags || [];
      if (!currentTags.includes('Eval')) {
        setLocalTags([...currentTags, 'Eval']);
      }
    } catch (error) {
      console.error('新增評估資料集失敗:', error);
      toast.error(t('datasets.addToEvalFailed', '新增失敗'));
    } finally {
      setAddingToEval(false);
    }
  };

  // 生成評估集變體
  const handleGenerateEvalVariant = async config => {
    if (!selectedModel) {
      toast.error(t('datasets.selectModelFirst', '請先選擇模型'));
      throw new Error('No model selected');
    }

    try {
      const language = i18n.language;
      const response = await fetch(`/api/projects/${projectId}/datasets/generate-eval-variant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          datasetId: dataset.id,
          model: selectedModel,
          language,
          questionType: config.questionType,
          count: config.count
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate variant');
      }

      const { data } = await response.json();

      // 為每個生成的項新增題型資訊，以便儲存時使用
      return Array.isArray(data) ? data.map(item => ({ ...item, questionType: config.questionType })) : [];
    } catch (error) {
      console.error('生成變體失敗:', error);
      toast.error(t('datasets.generateVariantFailed', '生成變體失敗'));
      throw error;
    }
  };

  // 儲存評估集變體
  const handleSaveEvalVariant = async variantItems => {
    try {
      // 過濾掉 'Eval' 標籤，並確保轉為逗號分隔的字串
      const tagsToSync = (localTags || []).filter(tag => tag !== 'Eval').join(',');

      const itemsToSave = variantItems.map(item => ({
        question: item.question,
        correctAnswer: item.correctAnswer,
        questionType: item.questionType || 'open_ended',
        options: item.options,
        tags: tagsToSync,
        note: dataset.note,
        chunkId: null // 變體暫時不關聯原始文字塊
      }));

      const response = await fetch(`/api/projects/${projectId}/eval-datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items: itemsToSave })
      });

      if (!response.ok) {
        throw new Error('Failed to save eval dataset');
      }

      const result = await response.json();
      toast.success(t('datasets.saveVariantSuccess', '已儲存到評估資料集'));

      // 關閉對話方塊
      setVariantDialog({ open: false, data: null });
    } catch (error) {
      console.error('儲存變體失敗:', error);
      toast.error(t('datasets.saveVariantFailed', '儲存失敗'));
    }
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
      <Divider sx={{ my: 2 }} />
      <Button
        variant="contained"
        color="primary"
        startIcon={<PlaylistAddIcon />}
        onClick={handleAddToEval}
        disabled={addingToEval}
        sx={{ py: 1, flex: 1 }}
      >
        {addingToEval ? t('common.processing') : t('datasets.addToEval')}
      </Button>
      <Divider sx={{ my: 2 }} />
      <Button
        variant="outlined"
        color="secondary"
        startIcon={<AutoFixHighIcon />}
        onClick={() => setVariantDialog({ open: true, data: null })}
        disabled={loading}
        sx={{ py: 1, flex: 1 }}
      >
        {t('datasets.generateEvalVariant')}
      </Button>

      <Divider sx={{ my: 2 }} />

      {currentDataset.aiEvaluation && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom color="primary">
            {t('datasets.aiEvaluation')}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {currentDataset.aiEvaluation}
          </Typography>
        </Paper>
      )}

      <EvalVariantDialog
        open={variantDialog.open}
        onClose={() => setVariantDialog({ open: false, data: null })}
        onGenerate={handleGenerateEvalVariant}
        onSave={handleSaveEvalVariant}
      />
    </Paper>
  );
}
