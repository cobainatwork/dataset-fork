'use client';
import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';
import ClusterDetailPanel from './ClusterDetailPanel';

function ClusterHeader({ cluster, t }) {
  const projectChips = cluster.projectNames || [];
  const isCross = projectChips.length > 1;
  const projectLabel = (() => {
    if (projectChips.length === 0) return t('duplicates.unknownProject', '未知專案');
    if (projectChips.length === 1) {
      return t('duplicates.belongsToProject', { name: projectChips[0].name, defaultValue: '所屬專案：{{name}}' });
    }
    if (projectChips.length <= 3) {
      const names = projectChips.map(p => p.name).join('、');
      return t('duplicates.crossProjects', { count: projectChips.length, names, defaultValue: '跨 {{count}} 個專案：{{names}}' });
    }
    return t('duplicates.crossProjectsManyShort', { count: projectChips.length, defaultValue: '跨 {{count}} 個專案' });
  })();
  const tipText = isCross ? projectChips.map(p => p.name).join('、') : '';

  return (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
      <Chip
        size="small"
        color="primary"
        label={t('duplicates.similarCount', { count: cluster.size, defaultValue: '{{count}} 筆相似問題' })}
      />
      <Tooltip title={tipText} placement="top" disableHoverListener={!isCross}>
        <Chip size="small" variant="outlined" label={projectLabel} />
      </Tooltip>
      <Chip
        size="small"
        variant="outlined"
        label={t('duplicates.avgSim', {
          pct: (cluster.avgSimilarity * 100).toFixed(1),
          defaultValue: '平均相似度 {{pct}}%',
        })}
      />
      {cluster.hasAnswerDivergence ? (
        <Chip
          size="small"
          color="warning"
          icon={<WarningAmberIcon />}
          label={t('duplicates.answerDivergent', '答案不一致')}
        />
      ) : (
        <Chip
          size="small"
          color="success"
          variant="outlined"
          icon={<CheckCircleOutlineIcon />}
          label={t('duplicates.answerConsistent', '答案一致')}
        />
      )}
    </Stack>
  );
}

export default function ClusterCardList({ filters }) {
  const { t } = useTranslation();
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadList() {
    setLoading(true);
    const params = new URLSearchParams({
      ...(filters.projectId ? { projectId: filters.projectId } : {}),
      onlyDivergent: String(filters.onlyDivergent),
      minSize: String(filters.minSize),
    });
    const res = await fetch(`/api/embedding/clusters?${params}`);
    const data = await res.json();
    setClusters(data.clusters || []);
    setLoading(false);
  }

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.projectId, filters.onlyDivergent, filters.minSize]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!clusters.length) {
    return (
      <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
        <Typography variant="body2">
          {t('duplicates.empty', '目前沒有偵測到重複問題群組')}
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {clusters.map(c => (
        <Accordion key={c.id} disableGutters TransitionProps={{ unmountOnExit: true }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <ClusterHeader cluster={c} t={t} />
          </AccordionSummary>
          <AccordionDetails sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <ClusterDetailPanel clusterId={c.id} avgSimilarity={c.avgSimilarity} onMutated={loadList} />
          </AccordionDetails>
        </Accordion>
      ))}
    </Stack>
  );
}
