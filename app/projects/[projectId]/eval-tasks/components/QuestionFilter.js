'use client';

import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Slider,
  Button
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import { useTranslation } from 'react-i18next';

const QUESTION_TYPES = [
  { value: 'true_false', labelKey: 'eval.questionTypes.true_false' },
  { value: 'single_choice', labelKey: 'eval.questionTypes.single_choice' },
  { value: 'multiple_choice', labelKey: 'eval.questionTypes.multiple_choice' },
  { value: 'short_answer', labelKey: 'eval.questionTypes.short_answer' },
  { value: 'open_ended', labelKey: 'eval.questionTypes.open_ended' }
];

export default function QuestionFilter({
  questionTypes,
  selectedTags,
  searchKeyword,
  questionCount,
  availableTags,
  filteredCount,
  onQuestionTypesChange,
  onTagsChange,
  onSearchChange,
  onQuestionCountChange,
  onReset
}) {
  const { t } = useTranslation();

  const hasFilters = questionTypes.length > 0 || selectedTags.length > 0 || searchKeyword || questionCount > 0;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <FilterAltIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, flex: 1 }}>
          {t('evalTasks.filterTitle')}
        </Typography>
        {hasFilters && (
          <Button size="small" startIcon={<ClearIcon />} onClick={onReset}>
            {t('evalTasks.clearFilter')}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* 關鍵字搜尋 */}
        <TextField
          fullWidth
          size="small"
          label={t('evalTasks.searchKeyword')}
          placeholder={t('evalTasks.searchPlaceholder')}
          value={searchKeyword}
          onChange={e => onSearchChange(e.target.value)}
        />

        {/* 題型和標籤篩選 - 並排顯示 */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* 題型篩選 */}
          <FormControl fullWidth size="small">
            <InputLabel>{t('evalTasks.filterByTypeLabel')}</InputLabel>
            <Select
              multiple
              value={questionTypes}
              onChange={e => onQuestionTypesChange(e.target.value)}
              input={<OutlinedInput label={t('evalTasks.filterByTypeLabel')} />}
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
                  <ListItemText primary={`${t(type.labelKey)} `} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 標籤篩選 */}
          {availableTags.length > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel>{t('evalTasks.filterByTagLabel')}</InputLabel>
              <Select
                multiple
                value={selectedTags}
                onChange={e => onTagsChange(e.target.value)}
                input={<OutlinedInput label={t('evalTasks.filterByTagLabel')} />}
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

        {/* 題目數量選擇 - 緊湊佈局 */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {t('evalTasks.questionCountLabel')}
              {questionCount === 0 ? t('common.all') : questionCount} / {filteredCount}
            </Typography>
            <TextField
              size="small"
              type="number"
              value={questionCount}
              onChange={e => onQuestionCountChange(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0, max: filteredCount }}
              sx={{ width: 100 }}
            />
          </Box>
          <Slider
            value={questionCount}
            onChange={(e, value) => onQuestionCountChange(value)}
            min={0}
            max={filteredCount}
            step={1}
            valueLabelDisplay="auto"
          />
          <Typography variant="caption" color="text.secondary">
            {questionCount === 0
              ? t('evalTasks.useAllQuestions')
              : t('evalTasks.randomSampleHint', { filteredCount, questionCount })}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
