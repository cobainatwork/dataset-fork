'use client';
import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Typography, Stack, CircularProgress } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function ClusterCardList({ filters }) {
  const { t } = useTranslation();
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      onlyDivergent: String(filters.onlyDivergent),
      minSize: String(filters.minSize),
    });
    fetch(`/api/embedding/clusters?${params}`)
      .then((r) => r.json())
      .then((data) => { setClusters(data.clusters || []); setLoading(false); });
  }, [filters]);

  if (loading) return <CircularProgress />;
  if (!clusters.length) return <Typography>{t('duplicates.empty')}</Typography>;

  return (
    <Stack spacing={2}>
      {clusters.map((c) => (
        <Card key={c.id}>
          <CardContent>
            <Typography variant="body2" sx={{ mb: 1 }}>Cluster {c.id}</Typography>
            <Stack direction="row" spacing={1}>
              <Chip label={t('duplicates.badge', { count: c.size })} color="primary" size="small" />
              {c.hasAnswerDivergence && (
                <Chip label={t('duplicates.divergent')} color="warning" size="small" icon={<span>⚠</span>} />
              )}
              <Chip label={`projects: ${c.projectCount}`} size="small" />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}
