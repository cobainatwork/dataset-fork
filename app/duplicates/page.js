'use client';
import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar/index';
import CrossProjectFilter from './CrossProjectFilter';
import ClusterCardList from './ClusterCardList';

export default function DuplicatesPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ projectId: '', onlyDivergent: false, minSize: 2 });

  useEffect(() => {
    fetch('/api/projects')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setProjects(Array.isArray(d) ? d : []))
      .catch(() => setProjects([]));
  }, []);

  return (
    <>
      <Navbar projects={projects} currentProject={null} />
      <Box sx={{ display: 'flex', p: 2, gap: 2 }}>
        <Box sx={{ width: 300, borderRight: 1, borderColor: 'divider', pr: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('duplicates.title')}
          </Typography>
          <CrossProjectFilter value={filters} onChange={setFilters} projects={projects} />
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <ClusterCardList filters={filters} />
        </Box>
      </Box>
    </>
  );
}
