'use client';
import { Box, FormControlLabel, Switch, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function CrossProjectFilter({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label={t('duplicates.filter.projectId')}
        value={value.projectId}
        onChange={(e) => onChange({ ...value, projectId: e.target.value })}
        size="small"
      />
      <TextField
        label={t('duplicates.filter.minSize')}
        type="number"
        value={value.minSize}
        onChange={(e) => onChange({ ...value, minSize: parseInt(e.target.value) || 2 })}
        size="small"
        inputProps={{ min: 2 }}
      />
      <FormControlLabel
        control={
          <Switch
            checked={value.onlyDivergent}
            onChange={(e) => onChange({ ...value, onlyDivergent: e.target.checked })}
          />
        }
        label={t('duplicates.filter.onlyDivergent')}
      />
    </Box>
  );
}
