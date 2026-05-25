'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  TextField,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Avatar,
  Paper
} from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useTranslation } from 'react-i18next';
import { alpha, useTheme } from '@mui/material/styles';

export default function CreateBlindTestDialog({ open, onClose, projectId, onCreate }) {
  const { t } = useTranslation();
  const theme = useTheme();

  // 模型選擇
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelA, setModelA] = useState(null);
  const [modelB, setModelB] = useState(null);

  // 題目選擇
  const [questionTypes, setQuestionTypes] = useState(['short_answer', 'open_ended']);
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);

  // 提交狀態
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 載入模型列表
  useEffect(() => {
    if (!open || !projectId) return;

    const fetchModels = async () => {
      try {
        setModelsLoading(true);
        const response = await fetch(`/api/projects/${projectId}/model-config`);
        const result = await response.json();

        if (result.data) {
          setModels(result.data);
        }
      } catch (err) {
        console.error('載入模型失敗:', err);
      } finally {
        setModelsLoading(false);
      }
    };

    fetchModels();
  }, [open, projectId]);

  // 載入標籤和題目數量
  useEffect(() => {
    if (!open || !projectId) return;

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/eval-datasets?page=1&pageSize=1&includeStats=true`);
        const result = await response.json();

        if (result.stats?.byTag) {
          setAvailableTags(Object.keys(result.stats.byTag).sort());
        }
      } catch (err) {
        console.error('載入統計失敗:', err);
      }
    };

    fetchStats();
  }, [open, projectId]);

  // 獲取符合條件的題目數量
  const fetchFilteredCount = useCallback(async () => {
    if (!projectId) return;

    try {
      setCountLoading(true);
      const params = new URLSearchParams();

      // 只查詢主觀題
      questionTypes.forEach(t => params.append('questionTypes', t));
      selectedTags.forEach(t => params.append('tags', t));

      const response = await fetch(`/api/projects/${projectId}/eval-datasets/count?${params.toString()}`);
      const result = await response.json();

      if (result.code === 0) {
        setFilteredCount(result.data?.total || 0);
      }
    } catch (err) {
      console.error('獲取題目數量失敗:', err);
    } finally {
      setCountLoading(false);
    }
  }, [projectId, questionTypes, selectedTags]);

  useEffect(() => {
    if (open) {
      fetchFilteredCount();
    }
  }, [open, fetchFilteredCount]);

  // 重置表單
  const resetForm = () => {
    setModelA(null);
    setModelB(null);
    setQuestionTypes(['short_answer', 'open_ended']);
    setSelectedTags([]);
    setQuestionCount(0);
    setError('');
  };

  // 關閉對話方塊
  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  // 提交建立
  const handleSubmit = async () => {
    // 驗證
    if (!modelA) {
      setError(t('blindTest.errorSelectModelA', '請選擇模型A'));
      return;
    }
    if (!modelB) {
      setError(t('blindTest.errorSelectModelB', '請選擇模型B'));
      return;
    }
    if (modelA.id === modelB.id) {
      setError(t('blindTest.errorSameModel', '兩個模型不能相同'));
      return;
    }
    if (filteredCount === 0) {
      setError(t('blindTest.errorNoQuestions', '沒有符合條件的題目'));
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // 獲取題目ID列表
      const params = new URLSearchParams();
      questionTypes.forEach(t => params.append('questionTypes', t));
      selectedTags.forEach(t => params.append('tags', t));

      const pageSize = questionCount > 0 ? questionCount : filteredCount;
      params.append('pageSize', pageSize.toString());

      const response = await fetch(`/api/projects/${projectId}/eval-datasets?${params.toString()}`);
      const result = await response.json();

      if (!result.items || result.items.length === 0) {
        setError(t('blindTest.errorNoQuestions', '沒有符合條件的題目'));
        return;
      }

      // 隨機選擇題目（如果指定了數量）
      let selectedIds = result.items.map(item => item.id);
      if (questionCount > 0 && questionCount < selectedIds.length) {
        // 隨機抽取
        selectedIds = selectedIds.sort(() => Math.random() - 0.5).slice(0, questionCount);
      }

      // 建立任務
      const createResult = await onCreate({
        modelA: { modelId: modelA.modelId, providerId: modelA.providerId, id: modelA.id },
        modelB: { modelId: modelB.modelId, providerId: modelB.providerId, id: modelB.id },
        evalDatasetIds: selectedIds
      });

      if (createResult.success) {
        handleClose();
      } else {
        setError(createResult.error || '建立失敗');
      }
    } catch (err) {
      console.error('建立任務失敗:', err);
      setError('建立任務失敗');
    } finally {
      setSubmitting(false);
    }
  };

  const QUESTION_TYPES = [
    { value: 'short_answer', labelKey: 'eval.questionTypes.short_answer' },
    { value: 'open_ended', labelKey: 'eval.questionTypes.open_ended' }
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundImage: 'none'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2
        }}
      >
        <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.1), display: 'flex' }}>
          <CompareArrowsIcon color="primary" />
        </Box>
        <Typography variant="h6" fontWeight="bold">
          {t('blindTest.createTitle', '建立盲測任務')}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 模型選擇 */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <SmartToyIcon fontSize="small" color="action" />
            {t('blindTest.selectModels', '選擇對比模型')}
          </Typography>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, bgcolor: 'background.default' }}>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
              {/* 模型A */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.75rem' }}>A</Avatar>
                  <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                    {t('blindTest.modelA', '模型 A')}
                  </Typography>
                </Box>
                <FormControl fullWidth size="small">
                  <Select
                    value={modelA?.id || ''}
                    onChange={e => {
                      const selected = models.find(m => m.id === e.target.value);
                      setModelA(selected || null);
                    }}
                    displayEmpty
                    disabled={modelsLoading}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="" disabled>
                      <Typography color="text.secondary">{t('common.select', '請選擇')}</Typography>
                    </MenuItem>
                    {models.map(model => (
                      <MenuItem key={model.id} value={model.id} disabled={model.id === modelB?.id}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {model.modelName || model.modelId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {model.providerName}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ alignSelf: 'center', pt: 3 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    color: 'text.secondary',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  VS
                </Box>
              </Box>

              {/* 模型B */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Avatar sx={{ width: 24, height: 24, bgcolor: 'secondary.main', fontSize: '0.75rem' }}>B</Avatar>
                  <Typography variant="subtitle2" color="secondary.main" fontWeight="bold">
                    {t('blindTest.modelB', '模型 B')}
                  </Typography>
                </Box>
                <FormControl fullWidth size="small">
                  <Select
                    value={modelB?.id || ''}
                    onChange={e => {
                      const selected = models.find(m => m.id === e.target.value);
                      setModelB(selected || null);
                    }}
                    displayEmpty
                    disabled={modelsLoading}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="" disabled>
                      <Typography color="text.secondary">{t('common.select', '請選擇')}</Typography>
                    </MenuItem>
                    {models.map(model => (
                      <MenuItem key={model.id} value={model.id} disabled={model.id === modelA?.id}>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {model.modelName || model.modelId}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {model.providerName}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {models.length === 0 && !modelsLoading && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {t('blindTest.noModelsAvailable', '暫無可用模型，請先在設定中配置模型')}
              </Alert>
            )}
          </Paper>
        </Box>

        {/* 題目篩選 */}
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            {t('blindTest.selectQuestions', '選擇測試題目')}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('blindTest.questionTypeHint', '盲測任務僅支援簡答題和開放題')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* 題型篩選 */}
              <FormControl fullWidth size="small">
                <InputLabel>{t('blindTest.questionType', '題型')}</InputLabel>
                <Select
                  multiple
                  value={questionTypes}
                  onChange={e => setQuestionTypes(e.target.value)}
                  input={<OutlinedInput label={t('blindTest.questionType', '題型')} />}
                  renderValue={selected => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map(value => (
                        <Chip key={value} label={t(`eval.questionTypes.${value}`)} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {QUESTION_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      <Checkbox checked={questionTypes.includes(type.value)} />
                      <ListItemText primary={t(type.labelKey)} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* 標籤篩選 */}
              {availableTags.length > 0 && (
                <FormControl fullWidth size="small">
                  <InputLabel>{t('blindTest.filterByTag', '按標籤篩選')}</InputLabel>
                  <Select
                    multiple
                    value={selectedTags}
                    onChange={e => setSelectedTags(e.target.value)}
                    input={<OutlinedInput label={t('blindTest.filterByTag', '按標籤篩選')} />}
                    renderValue={selected => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map(value => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {availableTags.map(tag => (
                      <MenuItem key={tag} value={tag}>
                        <Checkbox checked={selectedTags.includes(tag)} />
                        <ListItemText primary={tag} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            {/* 題目數量 */}
            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <TextField
                  size="small"
                  type="number"
                  label={t('blindTest.questionCount', '題目數量')}
                  value={questionCount}
                  onChange={e => setQuestionCount(Math.max(0, parseInt(e.target.value) || 0))}
                  inputProps={{ min: 0, max: filteredCount }}
                  sx={{ width: 150, bgcolor: 'background.paper' }}
                />

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {countLoading ? (
                        <CircularProgress size={14} />
                      ) : (
                        t('blindTest.availableQuestions', '可用題目：{{count}} 道', { count: filteredCount })
                      )}
                    </Typography>
                    {filteredCount > 0 && (
                      <Chip
                        label={t('common.ready', '就緒')}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ height: 20 }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    {questionCount === 0
                      ? t('blindTest.useAllQuestions', '使用全部篩選結果')
                      : t('blindTest.randomSample', '將隨機抽取 {{count}} 道題目', { count: questionCount })}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button onClick={handleClose} disabled={submitting} color="inherit" size="large">
          {t('common.cancel', '取消')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || !modelA || !modelB || filteredCount === 0}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CompareArrowsIcon />}
          size="large"
          sx={{ px: 4 }}
        >
          {submitting ? t('blindTest.creating', '建立中...') : t('blindTest.startBlindTest', '開始盲測')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
