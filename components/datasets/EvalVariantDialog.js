'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Card,
  CardContent,
  IconButton,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 評估集變體編輯對話方塊
 */
export default function EvalVariantDialog({ open, onClose, onGenerate, onSave }) {
  const { t } = useTranslation();
  const [step, setStep] = useState('config'); // 'config' | 'preview'
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    questionType: 'open_ended',
    count: 1
  });
  const [items, setItems] = useState([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('config');
      setConfig({ questionType: 'open_ended', count: 1 });
      setItems([]);
      setLoading(false);
    }
  }, [open]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await onGenerate(config);
      // Ensure data is an array
      const newItems = Array.isArray(data) ? data : [data];
      setItems(newItems);
      setStep('preview');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave(items);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleDeleteItem = index => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    if (newItems.length === 0) {
      setStep('config');
    }
  };

  const renderConfigStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {t('datasets.evalVariantConfigHint', '請選擇生成的題目型別和數量，AI 將基於當前問答對進行改寫。')}
      </Typography>

      <FormControl fullWidth>
        <InputLabel>{t('datasets.questionType', '題目型別')}</InputLabel>
        <Select
          value={config.questionType}
          label={t('datasets.questionType', '題目型別')}
          onChange={e => setConfig({ ...config, questionType: e.target.value })}
        >
          <MenuItem value="open_ended">{t('datasets.typeOpenEnded', '開放式問答')}</MenuItem>
          <MenuItem value="single_choice">{t('datasets.typeSingleChoice', '單選題')}</MenuItem>
          <MenuItem value="multiple_choice">{t('datasets.typeMultipleChoice', '多選題')}</MenuItem>
          <MenuItem value="true_false">{t('datasets.typeTrueFalse', '判斷題')}</MenuItem>
          <MenuItem value="short_answer">{t('datasets.typeShortAnswer', '簡答題')}</MenuItem>
        </Select>
      </FormControl>

      <Box>
        <Typography gutterBottom>
          {t('datasets.generateCount', '生成數量')}: {config.count}
        </Typography>
        <Slider
          value={config.count}
          onChange={(_, value) => setConfig({ ...config, count: value })}
          step={1}
          marks
          min={1}
          max={5}
          valueLabelDisplay="auto"
        />
      </Box>
    </Box>
  );

  const renderPreviewStep = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {t('datasets.evalVariantPreviewHint', '您可以編輯生成的題目，確認無誤後儲存到評估集。')}
      </Typography>

      {items.map((item, index) => (
        <Card key={index} variant="outlined">
          <CardContent sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <IconButton
              size="small"
              onClick={() => handleDeleteItem(index)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>

            <Typography variant="subtitle2" color="primary">
              {t('datasets.questionIndex', '題目 {{index}}', { index: index + 1 })}
            </Typography>

            <TextField
              label={t('datasets.question', '問題')}
              fullWidth
              multiline
              rows={2}
              value={item.question || ''}
              onChange={e => handleItemChange(index, 'question', e.target.value)}
              size="small"
            />

            {/* Render Options for choice questions */}
            {(item.options || config.questionType.includes('choice')) && (
              <TextField
                label={t('datasets.options', '選項 (JSON陣列)')}
                fullWidth
                multiline
                rows={2}
                value={Array.isArray(item.options) ? JSON.stringify(item.options) : item.options || ''}
                onChange={e => {
                  let val = e.target.value;
                  try {
                    // Try to parse if user inputs valid JSON, otherwise keep string
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) val = parsed;
                  } catch (e) {}
                  handleItemChange(index, 'options', val);
                }}
                helperText={t('datasets.optionsHint', '例如: ["選項A", "選項B"]')}
                size="small"
              />
            )}

            <TextField
              label={t('datasets.answer', '答案')}
              fullWidth
              multiline
              rows={2}
              value={Array.isArray(item.correctAnswer) ? JSON.stringify(item.correctAnswer) : item.correctAnswer || ''}
              onChange={e => {
                let val = e.target.value;
                // For multiple choice, answer might be array
                if (config.questionType === 'multiple_choice') {
                  try {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) val = parsed;
                  } catch (e) {}
                }
                handleItemChange(index, 'correctAnswer', val);
              }}
              helperText={
                config.questionType === 'multiple_choice'
                  ? t('datasets.answerArrayHint', '多選題答案請輸入陣列，如 ["A", "C"]')
                  : config.questionType === 'true_false'
                    ? t('datasets.answerBoolHint', '判斷題答案請輸入 ✅ 或 ❌')
                    : ''
              }
              size="small"
            />
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {step === 'config'
          ? t('datasets.evalVariantTitle', '生成評估集變體')
          : t('datasets.evalVariantPreviewTitle', '確認生成的題目')}
      </DialogTitle>

      <DialogContent dividers>{step === 'config' ? renderConfigStep() : renderPreviewStep()}</DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel')}
        </Button>

        {step === 'config' ? (
          <Button
            onClick={handleGenerate}
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {loading ? t('common.generating', '生成中...') : t('datasets.generate', '生成')}
          </Button>
        ) : (
          <Button onClick={handleSave} variant="contained" color="primary" disabled={items.length === 0}>
            {t('datasets.saveToEval', '儲存到評估集')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
