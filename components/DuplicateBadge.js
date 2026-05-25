'use client';
import { Chip, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function DuplicateBadge({ count, divergent }) {
  const { t } = useTranslation();
  if (!count || count < 2) return null;
  return (
    <Tooltip title={t('duplicates.badgeTooltip', { count })}>
      <Chip
        label={`${t('duplicates.badgeLabel')} ×${count}${divergent ? ' ⚠' : ''}`}
        color={divergent ? 'warning' : 'primary'}
        size="small"
      />
    </Tooltip>
  );
}
