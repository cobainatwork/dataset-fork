'use client';
import { useEffect, useState } from 'react';
import {
  Box,
  FormControlLabel,
  Switch,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function CrossProjectFilter({ value, onChange }) {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl size="small" fullWidth>
        <InputLabel id="duplicates-project-filter">
          {t('duplicates.filter.project', '專案')}
        </InputLabel>
        <Select
          labelId="duplicates-project-filter"
          label={t('duplicates.filter.project', '專案')}
          value={value.projectId || ''}
          onChange={e => onChange({ ...value, projectId: e.target.value })}
        >
          <MenuItem value="">
            <em>{t('duplicates.filter.allProjects', '全部專案')}</em>
          </MenuItem>
          {projects.map(p => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label={t('duplicates.filter.minSize', '最少幾筆才視為重複')}
        type="number"
        value={value.minSize}
        onChange={e => onChange({ ...value, minSize: parseInt(e.target.value) || 2 })}
        size="small"
        inputProps={{ min: 2 }}
      />
      <FormControlLabel
        control={
          <Switch
            checked={value.onlyDivergent}
            onChange={e => onChange({ ...value, onlyDivergent: e.target.checked })}
          />
        }
        label={t('duplicates.filter.onlyDivergent', '只看答案不一致')}
      />
    </Box>
  );
}
