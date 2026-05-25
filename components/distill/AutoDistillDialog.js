'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Paper,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';

/**
 * 全自動蒸餾資料集配置彈框
 * @param {Object} props
 * @param {boolean} props.open - 對話方塊是否開啟
 * @param {Function} props.onClose - 關閉對話方塊的回撥
 * @param {Function} props.onStart - 開始蒸餾任務的回撥
 * @param {Function} props.onStartBackground - 開始後臺蒸餾任務的回撥
 * @param {string} props.projectId - 專案ID
 * @param {Object} props.project - 專案資訊
 * @param {Object} props.stats - 當前統計資訊
 */
export default function AutoDistillDialog({
  open,
  onClose,
  onStart,
  onStartBackground,
  projectId,
  project,
  stats = {}
}) {
  const { t } = useTranslation();

  // 表單狀態
  const [topic, setTopic] = useState('');
  const [levels, setLevels] = useState(2);
  const [tagsPerLevel, setTagsPerLevel] = useState(10);
  const [questionsPerTag, setQuestionsPerTag] = useState(10);
  const [datasetType, setDatasetType] = useState('single-turn'); // 'single-turn' | 'multi-turn' | 'both'

  // 計算資訊
  const [estimatedTags, setEstimatedTags] = useState(0); // 所有標籤總數（包括根節點和中間節點）
  const [leafTags, setLeafTags] = useState(0); // 葉子節點數量（即最後一層標籤數）
  const [estimatedQuestions, setEstimatedQuestions] = useState(0);
  const [newTags, setNewTags] = useState(0);
  const [newQuestions, setNewQuestions] = useState(0);
  const [error, setError] = useState('');

  // 初始化預設主題
  useEffect(() => {
    if (project && project.name) {
      setTopic(project.name);
    }
  }, [project]);

  // 計算預估標籤和問題數量
  useEffect(() => {
    /*
     * 根據公式：總問題數 = \left( \prod_{i=1}^{n} L_i \right) \times Q
     * 當每層標籤數量相同(L)時：總問題數 = L^n \times Q
     */

    const leafTags = Math.pow(tagsPerLevel, levels);

    // 總問題數 = 葉子節點數 * 每個節點的問題數
    const totalQuestions = leafTags * questionsPerTag;

    let totalTags;
    if (tagsPerLevel === 1) {
      // 如果每層只有1個標籤，總數就是 levels+1
      totalTags = levels + 1;
    } else {
      // 使用等比數列求和公式
      totalTags = (1 - Math.pow(tagsPerLevel, levels + 1)) / (1 - tagsPerLevel);
    }

    setLeafTags(leafTags);
    setEstimatedTags(leafTags); // 改為只顯示葉子節點數量，而非所有節點數量
    setEstimatedQuestions(totalQuestions);

    // 計算新增標籤和問題數量
    const currentTags = stats.tagsCount || 0;
    const currentQuestions = stats.questionsCount || 0;

    // 只考慮最後一層的標籤數量
    setNewTags(Math.max(0, leafTags - currentTags));
    setNewQuestions(Math.max(0, totalQuestions - currentQuestions));

    // 驗證是否可以執行任務
    if (leafTags <= currentTags && totalQuestions <= currentQuestions) {
      setError(t('distill.autoDistillInsufficientError'));
    } else {
      setError('');
    }
  }, [levels, tagsPerLevel, questionsPerTag, stats, t]);

  // 處理開始任務
  const handleStart = () => {
    if (error) return;

    onStart({
      topic,
      levels,
      tagsPerLevel,
      questionsPerTag,
      estimatedTags,
      estimatedQuestions,
      datasetType
    });
  };

  // 處理開始後臺任務
  const handleStartBackground = () => {
    if (error) return;

    onStartBackground({
      topic,
      levels,
      tagsPerLevel,
      questionsPerTag,
      estimatedTags,
      estimatedQuestions,
      datasetType
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t('distill.autoDistillTitle')}</DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* 左側：輸入區域 */}
          <Box sx={{ flex: 1 }}>
            <TextField
              label={t('distill.distillTopic')}
              value={topic}
              onChange={e => setTopic(e.target.value)}
              fullWidth
              margin="normal"
              required
              disabled
              helperText={t('distill.rootTopicHelperText')}
            />

            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography gutterBottom>{t('distill.tagLevels')}</Typography>
              <TextField
                type="number"
                fullWidth
                InputProps={{
                  inputProps: { min: 1, max: 5 }
                }}
                value={levels}
                onChange={e => {
                  const value = Math.min(5, Math.max(1, Number(e.target.value)));
                  setLevels(value);
                }}
                helperText={t('distill.tagLevelsHelper', { max: 5 })}
              />
            </Box>

            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography gutterBottom>{t('distill.tagsPerLevel')}</Typography>
              <TextField
                type="number"
                fullWidth
                InputProps={{
                  inputProps: { min: 1, max: 50 }
                }}
                value={tagsPerLevel}
                onChange={e => {
                  const value = Math.min(50, Math.max(1, Number(e.target.value)));
                  setTagsPerLevel(value);
                }}
                helperText={t('distill.tagsPerLevelHelper', { max: 50 })}
              />
            </Box>

            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography gutterBottom>{t('distill.questionsPerTag')}</Typography>
              <TextField
                type="number"
                fullWidth
                InputProps={{
                  inputProps: { min: 1, max: 50 }
                }}
                value={questionsPerTag}
                onChange={e => {
                  const value = Math.min(50, Math.max(1, Number(e.target.value)));
                  setQuestionsPerTag(value);
                }}
                helperText={t('distill.questionsPerTagHelper', { max: 50 })}
              />
            </Box>

            <Box sx={{ mt: 3, mb: 2 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'medium' }}>
                  {t('distill.datasetType', { defaultValue: '資料集型別' })}
                </FormLabel>
                <RadioGroup value={datasetType} onChange={e => setDatasetType(e.target.value)}>
                  <FormControlLabel
                    value="single-turn"
                    control={<Radio />}
                    label={t('distill.singleTurnDataset', { defaultValue: '單輪對話資料集' })}
                  />
                  <FormControlLabel
                    value="multi-turn"
                    control={<Radio />}
                    label={t('distill.multiTurnDataset', { defaultValue: '多輪對話資料集' })}
                  />
                  <FormControlLabel
                    value="both"
                    control={<Radio />}
                    label={t('distill.bothDatasetTypes', { defaultValue: '兩種資料集都生成' })}
                  />
                </RadioGroup>
              </FormControl>
            </Box>
          </Box>

          {/* 右側：預估資訊區域 */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                mt: 1,
                borderRadius: 2,
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('distill.estimationInfo')}
              </Typography>

              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, mt: 2 }}>
                    <Typography variant="subtitle2">{t('distill.estimatedTags')}:</Typography>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {estimatedTags}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2">{t('distill.estimatedQuestions')}:</Typography>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {estimatedQuestions}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2">{t('distill.currentTags')}:</Typography>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {stats.tagsCount || 0}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle2">{t('distill.currentQuestions')}:</Typography>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {stats.questionsCount || 0}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" color="primary">
                      {t('distill.newTags')}:
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      {newTags}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" color="primary">
                      {t('distill.newQuestions')}:
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      {newQuestions}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleStartBackground} color="secondary" variant="outlined" disabled={!!error || !topic}>
          {t('distill.startAutoDistillBackground', { defaultValue: '開始自動蒸餾（後臺執行）' })}
        </Button>
        <Button onClick={handleStart} color="primary" variant="contained" disabled={!!error || !topic}>
          {t('distill.startAutoDistill')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
