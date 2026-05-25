'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Button,
  Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';

/**
 * 欄位對映步驟元件
 */
export default function FieldMappingStep({ previewData, onMappingComplete, onError }) {
  const { t } = useTranslation();
  const [fieldMapping, setFieldMapping] = useState({
    question: '',
    answer: '',
    cot: '',
    tags: ''
  });
  const [availableFields, setAvailableFields] = useState([]);
  const [mappingValid, setMappingValid] = useState(false);

  // 智慧欄位識別（支援 Alpaca: instruction + input -> question，output -> answer）
  const smartFieldMapping = fields => {
    const mapping = {
      question: '',
      answer: '',
      cot: '',
      tags: ''
    };

    const lower = fields.map(f => f.toLowerCase());
    const instructionIdx = lower.findIndex(f => f.includes('instruction'));
    const inputIdx = lower.findIndex(f => f.includes('input'));
    const outputIdx = lower.findIndex(f => f.includes('output'));

    // Alpaca 格式的優先識別
    if (instructionIdx !== -1 && inputIdx !== -1) {
      // 如果同時有instruction和input欄位，將它們組合為question
      mapping.question = [fields[instructionIdx], fields[inputIdx]];
    } else if (instructionIdx !== -1) {
      // 如果只有instruction欄位（比如從ShareGPT轉換而來），直接對映為question
      mapping.question = fields[instructionIdx];
    }

    if (outputIdx !== -1) {
      mapping.answer = fields[outputIdx];
    }

    const questionKeywords = ['question', 'input', 'query', 'prompt', 'instruction', '問題', '輸入', '指令'];
    const answerKeywords = ['answer', 'output', 'response', 'completion', 'target', '答案', '輸出', '回答'];
    const cotKeywords = ['cot', 'reasoning', 'explanation', 'thinking', 'rationale', '思維鏈', '推理', '解釋'];
    const tagKeywords = ['tag', 'tags', 'label', 'labels', 'category', 'categories', '標籤', '類別'];

    fields.forEach(field => {
      const fieldLower = field.toLowerCase();

      if (!mapping.question || (typeof mapping.question === 'string' && !mapping.question)) {
        if (questionKeywords.some(keyword => fieldLower.includes(keyword))) {
          mapping.question = field;
        }
      } else if (!mapping.answer) {
        if (answerKeywords.some(keyword => fieldLower.includes(keyword))) {
          mapping.answer = field;
        }
      } else if (!mapping.cot) {
        if (cotKeywords.some(keyword => fieldLower.includes(keyword))) {
          mapping.cot = field;
        }
      } else if (!mapping.tags) {
        if (tagKeywords.some(keyword => fieldLower.includes(keyword))) {
          mapping.tags = field;
        }
      }
    });

    return mapping;
  };

  useEffect(() => {
    if (previewData && previewData.length > 0) {
      const fields = Object.keys(previewData[0]);
      setAvailableFields(fields);

      // 智慧識別字段對映
      const smartMapping = smartFieldMapping(fields);
      setFieldMapping(smartMapping);
    }
  }, [previewData]);

  useEffect(() => {
    // 驗證對映是否有效（問題和答案欄位必須選擇）
    const hasQuestion = Array.isArray(fieldMapping.question)
      ? fieldMapping.question.length > 0
      : !!fieldMapping.question;
    const hasAnswer = !!fieldMapping.answer;
    const isValid = hasQuestion && hasAnswer;
    setMappingValid(isValid);
  }, [fieldMapping]);

  const handleFieldChange = (targetField, sourceField) => {
    setFieldMapping(prev => ({
      ...prev,
      [targetField]:
        targetField === 'question'
          ? Array.isArray(sourceField)
            ? sourceField.filter(Boolean)
            : sourceField
          : sourceField
    }));
  };

  const handleConfirmMapping = () => {
    if (!mappingValid) {
      onError(t('import.mappingRequired', '問題和答案欄位為必選項'));
      return;
    }

    // 檢查是否有重複對映（相容陣列）
    const flatFields = Object.values(fieldMapping)
      .filter(Boolean)
      .flatMap(f => (Array.isArray(f) ? f.filter(Boolean) : [f]));
    const uniqueFields = [...new Set(flatFields)];
    if (flatFields.length !== uniqueFields.length) {
      onError(t('import.duplicateMapping', '不能將多個目標欄位對映到同一個源欄位'));
      return;
    }

    onMappingComplete(fieldMapping);
  };

  const getFieldDescription = field => {
    switch (field) {
      case 'question':
        return t('import.questionDesc', '使用者的問題或輸入內容（必選，可多選）');
      case 'answer':
        return t('import.answerDesc', 'AI的回答或輸出內容（必選）');
      case 'cot':
        return t('import.cotDesc', '思維鏈或推理過程（可選）');
      case 'tags':
        return t('import.tagsDesc', '標籤陣列，多個標籤用逗號分隔（可選）');
      default:
        return '';
    }
  };

  const isFieldRequired = field => {
    return field === 'question' || field === 'answer';
  };

  if (!previewData || previewData.length === 0) {
    return <Alert severity="error">{t('import.noPreviewData', '沒有可預覽的資料')}</Alert>;
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('import.fieldMapping', '欄位對映')}
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t(
          'import.mappingDescription',
          '請將源資料的欄位對映到目標欄位。系統已自動識別可能的對映關係，您可以根據需要調整。'
        )}
      </Typography>

      {/* 欄位對映選擇 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          {t('import.selectMapping', '選擇欄位對映')}
        </Typography>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {Object.keys(fieldMapping).map(targetField => (
            <FormControl key={targetField} fullWidth>
              <InputLabel>
                {t(`import.${targetField}Field`, targetField)}
                {isFieldRequired(targetField) && <span style={{ color: 'red' }}>*</span>}
              </InputLabel>
              {targetField === 'question' ? (
                <Select
                  multiple
                  value={
                    Array.isArray(fieldMapping.question)
                      ? fieldMapping.question
                      : fieldMapping.question
                        ? [fieldMapping.question]
                        : []
                  }
                  label={t(`import.${targetField}Field`, targetField)}
                  onChange={e => handleFieldChange(targetField, e.target.value)}
                  renderValue={selected => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map(value => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {availableFields.map(field => (
                    <MenuItem key={field} value={field}>
                      {field}
                    </MenuItem>
                  ))}
                </Select>
              ) : (
                <Select
                  value={fieldMapping[targetField]}
                  label={t(`import.${targetField}Field`, targetField)}
                  onChange={e => handleFieldChange(targetField, e.target.value)}
                >
                  <MenuItem value="">
                    <em>{t('import.selectField', '選擇欄位')}</em>
                  </MenuItem>
                  {availableFields.map(field => (
                    <MenuItem key={field} value={field}>
                      {field}
                    </MenuItem>
                  ))}
                </Select>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {getFieldDescription(targetField)}
              </Typography>
            </FormControl>
          ))}
        </Box>
      </Paper>

      {/* 資料預覽 */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1">{t('import.dataPreview', '資料預覽')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t('import.previewNote', '顯示前3條記錄，每個欄位值最多顯示100個字元')}
          </Typography>
        </Box>

        <TableContainer sx={{ maxHeight: 400 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {availableFields.map(field => (
                  <TableCell key={field} sx={{ minWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">{field}</Typography>
                      {Object.entries(fieldMapping).map(([targetField, sourceField]) => {
                        const match = Array.isArray(sourceField) ? sourceField.includes(field) : sourceField === field;
                        if (match) {
                          return (
                            <Chip
                              key={targetField}
                              label={t(`import.${targetField}Field`, targetField)}
                              size="small"
                              color={isFieldRequired(targetField) ? 'primary' : 'default'}
                              variant="outlined"
                            />
                          );
                        }
                        return null;
                      })}
                    </Box>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {previewData.map((row, index) => (
                <TableRow key={index}>
                  {availableFields.map(field => (
                    <TableCell key={field}>
                      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                        {row[field] || '-'}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 確認按鈕 */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleConfirmMapping} disabled={!mappingValid}>
          {t('import.confirmMapping', '確認對映')}
        </Button>
      </Box>

      {!mappingValid && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('import.requiredFields', '請至少選擇問題和答案欄位的對映')}
        </Alert>
      )}
    </Box>
  );
}
