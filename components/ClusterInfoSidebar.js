'use client';
import { useEffect, useState } from 'react';
import { Box, Typography, Stack, Chip, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function ClusterInfoSidebar({ clusterId }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!clusterId) return;
    fetch(`/api/embedding/clusters/${clusterId}`).then((r) => r.json()).then(setData);
  }, [clusterId]);

  if (!clusterId) return null;
  if (!data) return <Typography>{t('common.loading')}</Typography>;

  async function submitFeedback(verdict) {
    await fetch(`/api/embedding/clusters/${clusterId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verdict, similarityAtTime: data.cluster.avgSimilarity }),
    });
    alert(t('cluster.feedback.thanks'));
  }

  return (
    <Box sx={{ p: 2, borderLeft: 1, borderColor: 'divider' }}>
      <Typography variant="h6">{t('cluster.info.title')}</Typography>
      <Stack direction="row" spacing={1} sx={{ my: 2 }}>
        <Chip label={`size ${data.cluster.size}`} />
        {data.cluster.hasAnswerDivergence && <Chip label={t('duplicates.divergent')} color="warning" />}
      </Stack>
      <Typography variant="body2" sx={{ mb: 2 }}>{t('cluster.info.members', { count: data.members.length })}</Typography>
      <Stack direction="row" spacing={1}>
        <Button size="small" onClick={() => submitFeedback('correct')}>{t('cluster.feedback.correct')}</Button>
        <Button size="small" onClick={() => submitFeedback('incorrect')}>{t('cluster.feedback.incorrect')}</Button>
        <Button size="small" onClick={() => submitFeedback('partial')}>{t('cluster.feedback.partial')}</Button>
      </Stack>
    </Box>
  );
}
