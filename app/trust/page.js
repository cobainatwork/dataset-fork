'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Alert, CircularProgress, Container } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Navbar from '@/components/Navbar/index';
import ConfidenceCurve from './ConfidenceCurve';

export default function TrustPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => (r.ok ? r.json() : []))
      .then(d => setProjects(Array.isArray(d) ? d : []))
      .catch(() => setProjects([]));
    fetch('/api/embedding/trust')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ buckets: {}, totalFeedback: 0, suggestion: null }));
  }, []);

  return (
    <>
      <Navbar projects={projects} currentProject={null} />
      <Container maxWidth="md" sx={{ pt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {t('trust.title')}
        </Typography>
        {!data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Typography variant="body2" sx={{ my: 2 }}>
              {t('trust.totalFeedback', { count: data.totalFeedback })}
            </Typography>
            {data.suggestion && (
              <Alert severity="info">
                {t('trust.suggestion', { threshold: data.suggestion.toFixed(2) })}
              </Alert>
            )}
            <ConfidenceCurve buckets={data.buckets} />
          </>
        )}
      </Container>
    </>
  );
}
