'use client';
import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RemoveIcon from '@mui/icons-material/Remove';
import { useTranslation } from 'react-i18next';
import MemberRow from './MemberRow';

export default function ClusterDetailPanel({ clusterId, avgSimilarity, onMutated }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/embedding/clusters/${clusterId}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  async function submitFeedback(verdict) {
    await fetch(`/api/embedding/clusters/${clusterId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verdict, similarityAtTime: avgSimilarity || 0 }),
    });
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 2500);
  }

  async function onMemberDeleted(_questionId) {
    // 刪完通知父層重抓 list（cluster 可能整個消失）
    if (typeof onMutated === 'function') onMutated();
  }

  if (loading || !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }

  const members = data.members || [];
  const cluster = data.cluster || {};
  const divergent = cluster.hasAnswerDivergence;

  return (
    <Stack spacing={2}>
      {divergent && (
        <Alert severity="warning" variant="outlined">
          {t(
            'duplicates.divergentNotice',
            '此群組內的答案不一致，請特別小心處理。建議先檢視各筆答案、再決定是否合併或修正，不建議直接刪除。'
          )}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {members.map((m, idx) => (
          <MemberRow
            key={m.id}
            member={m}
            index={idx}
            isPrimary={m.clusterRole === 'primary'}
            divergent={divergent}
            onDeleted={onMemberDeleted}
          />
        ))}
      </Stack>

      <Divider />

      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.primary' }}>
          {t('duplicates.reviewSection', '審查回饋')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t(
            'duplicates.reviewHint',
            '你的回饋會用來校準系統閾值（不會動到任何問題資料）。'
          )}
        </Typography>
        <ButtonGroup variant="outlined" size="small">
          <Button onClick={() => submitFeedback('correct')} startIcon={<CheckIcon />}>
            {t('duplicates.verdict.correct', '真重複')}
          </Button>
          <Button onClick={() => submitFeedback('incorrect')} startIcon={<CloseIcon />}>
            {t('duplicates.verdict.incorrect', '系統誤判')}
          </Button>
          <Button onClick={() => submitFeedback('partial')} startIcon={<RemoveIcon />}>
            {t('duplicates.verdict.partial', '部分相似')}
          </Button>
        </ButtonGroup>
        {feedbackSent && (
          <Typography variant="caption" sx={{ ml: 2, color: 'success.main' }}>
            {t('duplicates.feedbackThanks', '已記錄，感謝你的回饋')}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
