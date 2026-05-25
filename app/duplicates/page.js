'use client';
import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CrossProjectFilter from './CrossProjectFilter';
import ClusterCardList from './ClusterCardList';

export default function DuplicatesPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ projectId: '', onlyDivergent: false, minSize: 2 });

  return (
    <Box sx={{ display: 'flex', height: '100vh', p: 2 }}>
      <Box sx={{ width: 300, mr: 2, borderRight: 1, borderColor: 'divider', pr: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{t('duplicates.title')}</Typography>
        <CrossProjectFilter value={filters} onChange={setFilters} />
      </Box>
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <ClusterCardList filters={filters} />
      </Box>
    </Box>
  );
}
