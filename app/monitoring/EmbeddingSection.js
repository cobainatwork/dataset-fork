'use client';
import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, CircularProgress, Divider, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function EmbeddingSection() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/embedding/stats')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message || String(e)));
  }, []);

  if (error) return <Alert severity="error" sx={{ mt: 4 }}>Embedding stats unavailable: {error}</Alert>;
  if (!data) return <CircularProgress />;

  const cards = [
    { label: t('embedding.stats.totalEmbedded'), value: data.stats.totalEmbedded },
    { label: t('embedding.stats.totalClusters'), value: data.stats.totalClusters },
    { label: t('embedding.stats.crossProject'), value: data.stats.crossProject },
    { label: t('embedding.stats.divergent'), value: data.stats.divergentCount },
  ];

  return (
    <Box sx={{ mt: 4 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="h5" sx={{ mb: 2 }}>{t('embedding.stats.title')}</Typography>
      <Grid container spacing={2}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                <Typography variant="h4">{c.value.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>{t('embedding.stats.latencies')}</Typography>
      <Box>
        {data.latencies.map((l) => (
          <Box key={l.operation} sx={{ mb: 1 }}>
            {l.operation}: p50={l.p50}ms · p95={l.p95}ms · p99={l.p99}ms
          </Box>
        ))}
      </Box>
    </Box>
  );
}
