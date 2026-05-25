'use client';

import { Autocomplete, TextField, Box, Typography, Chip, Button, Dialog } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function QuestionSelector({
  templates,
  selectedTemplate,
  onTemplateChange,
  answeredQuestions = [],
  unansweredQuestions = [],
  onOpenCreateQuestion,
  onOpenCreateTemplate
}) {
  const { t } = useTranslation();
  const [showNoQuestionsMessage, setShowNoQuestionsMessage] = useState(false);

  // 構建未完成標註的問題選項（用於下拉框）
  const dropdownOptions = unansweredQuestions.map(q => ({
    ...q,
    isUnanswered: true
  }));

  const getAnswerTypeLabel = answerType => {
    switch (answerType) {
      case 'text':
        return t('images.answerTypeText', { defaultValue: '文字' });
      case 'label':
        return t('images.answerTypeLabel', { defaultValue: '標籤' });
      case 'custom_format':
        return t('images.answerTypeCustomFormat', { defaultValue: '自定義格式' });
      default:
        return answerType;
    }
  };

  // 判斷是否有待標註問題
  const hasUnansweredQuestions = unansweredQuestions.length > 0;
  const hasAnsweredQuestions = answeredQuestions.length > 0;
  const hasAnyQuestions = hasUnansweredQuestions || hasAnsweredQuestions;

  return (
    <Box>
      {/* 已標註問題區域 - 最佳化顯示為一行，新增最大高度 */}
      {answeredQuestions.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="600" gutterBottom sx={{ mb: 1.5, color: 'text.secondary' }}>
            {t('images.answeredQuestions', { defaultValue: '已標註問題' })} ({answeredQuestions.length})
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              maxHeight: 120,
              overflowY: 'auto',
              paddingRight: 1,
              '&::-webkit-scrollbar': {
                width: '6px'
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'transparent'
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'action.disabled',
                borderRadius: 1,
                '&:hover': {
                  bgcolor: 'action.active'
                }
              }
            }}
          >
            {answeredQuestions.map(question => (
              <Chip
                key={question.id}
                label={question.question}
                size="small"
                color="success"
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  maxWidth: '100%',
                  '& .MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* 問題選擇下拉框 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mb: 2 }}>
          {t('images.selectNewQuestion', { defaultValue: '選擇新問題' })}
        </Typography>

        {!hasUnansweredQuestions ? (
          // 沒有待標註問題的提示
          <Box
            sx={{
              p: 3,
              textAlign: 'center',
              bgcolor: 'background.paper',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              mb: 2
            }}
          >
            {hasAnsweredQuestions ? (
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {t('images.allQuestionsAnnotated', { defaultValue: '當前圖片所有問題已標註完成' })}
              </Typography>
            ) : (
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {t('images.noQuestionsAssociated', { defaultValue: '當前圖片未關聯任何問題' })}
              </Typography>
            )}
          </Box>
        ) : (
          // 有待標註問題時顯示下拉框
          <Autocomplete
            fullWidth
            options={dropdownOptions}
            value={selectedTemplate}
            onChange={(event, newValue) => {
              if (newValue) {
                onTemplateChange(newValue);
              }
            }}
            getOptionLabel={option => option.question || ''}
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="500">
                    {option.question}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip label={getAnswerTypeLabel(option.answerType)} size="small" sx={{ borderRadius: 1 }} />
                    <Chip
                      label={t('images.pendingAnswer', { defaultValue: '待標註' })}
                      size="small"
                      color="warning"
                      variant="filled"
                      sx={{ borderRadius: 1, fontSize: '0.75rem' }}
                    />
                  </Box>
                </Box>
              </Box>
            )}
            renderInput={params => (
              <TextField
                {...params}
                placeholder={t('images.selectQuestionPlaceholder', { defaultValue: '請選擇問題進行標註...' })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': {
                      borderWidth: 2
                    },
                    '&:hover fieldset': {
                      borderColor: 'primary.main'
                    }
                  }
                }}
              />
            )}
            isOptionEqualToValue={(option, value) => option.id === value.id}
          />
        )}

        {selectedTemplate && selectedTemplate.description && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {selectedTemplate.description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
