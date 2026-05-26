'use client';
import { useEffect, useState } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function DuplicateBadge({ clusterId }) {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!clusterId) return;
    let cancelled = false;
    fetch(`/api/embedding/clusters/${clusterId}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data?.cluster) {
          setInfo({ size: data.cluster.size, divergent: data.cluster.hasAnswerDivergence });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [clusterId]);

  if (!clusterId || !info || info.size < 2) return null;

  return (
    <Tooltip title={t('duplicates.badgeTooltip', { count: info.size })}>
      <Chip
        label={`${t('duplicates.badgeLabel')} ×${info.size}${info.divergent ? ' ⚠' : ''}`}
        color={info.divergent ? 'warning' : 'primary'}
        size="small"
      />
    </Tooltip>
  );
}
