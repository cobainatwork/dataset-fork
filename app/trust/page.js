'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ConfidenceCurve from './ConfidenceCurve';

export default function TrustPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/embedding/trust').then((r) => r.json()).then(setData); }, []);
  if (!data) return null;
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6">{t('trust.title')}</Typography>
      <Typography variant="body2" sx={{ my: 2 }}>{t('trust.totalFeedback', { count: data.totalFeedback })}</Typography>
      {data.suggestion && (
        <Alert severity="info">{t('trust.suggestion', { threshold: data.suggestion.toFixed(2) })}</Alert>
      )}
      <ConfidenceCurve buckets={data.buckets} />
    </Box>
  );
}
