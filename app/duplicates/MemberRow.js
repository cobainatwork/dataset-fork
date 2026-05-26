'use client';
import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MemberRow({ member, index, isPrimary, divergent, onDeleted }) {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const similarityPct = typeof member.similarityScore === 'number'
    ? Math.max(0, Math.min(1, member.similarityScore)) * 100
    : null;

  const answer = member.answer;
  const isAnswerConfirmed = !!(answer && answer.confirmed);
  const deletable = !divergent && !isAnswerConfirmed;
  const lockReason = divergent
    ? t('duplicates.deleteLock.divergent', '此群組答案不一致，刪除會破壞分歧資料分析。請至問題管理頁人工處理。')
    : isAnswerConfirmed
    ? t('duplicates.deleteLock.confirmed', '此問題的答案已確認，請至問題管理頁檢視後再決定是否刪除。')
    : '';

  async function doDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${member.projectId}/questions/${member.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setConfirmOpen(false);
      if (typeof onDeleted === 'function') onDeleted(member.id);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        p: 2,
        bgcolor: isPrimary ? 'action.hover' : 'background.paper',
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="subtitle2">
            {t('duplicates.memberLabel', { n: index + 1, defaultValue: '第 {{n}} 筆問題' })}
          </Typography>
          {isPrimary ? (
            <Typography variant="caption" color="text.secondary">
              {t('duplicates.primaryHint', '（系統挑選為群組代表）')}
            </Typography>
          ) : (
            similarityPct !== null && (
              <Typography variant="caption" color="text.secondary">
                {t('duplicates.similarityWithFirst', {
                  pct: similarityPct.toFixed(1),
                  defaultValue: '與第 1 筆相似 {{pct}}%',
                })}
              </Typography>
            )
          )}
        </Stack>
      </Stack>

      <Typography variant="body1" sx={{ mb: 1.5, whiteSpace: 'pre-wrap' }}>
        {member.question}
      </Typography>

      {!isPrimary && similarityPct !== null && (
        <Box sx={{ mb: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={similarityPct}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}

      <Stack spacing={0.5} sx={{ mb: 1.5 }}>
        {member.chunk?.fileName && (
          <Typography variant="caption" color="text.secondary">
            {t('duplicates.sourceFile', '來源檔案')}：{member.chunk.fileName}
          </Typography>
        )}
        {member.chunk?.name && (
          <Typography variant="caption" color="text.secondary">
            {t('duplicates.sourceChunk', '來源段落')}：{member.chunk.name}
          </Typography>
        )}
        {member.project?.name && (
          <Typography variant="caption" color="text.secondary">
            {t('duplicates.belongsToProjectShort', '所屬專案')}：{member.project.name}
          </Typography>
        )}
        {member.createAt && (
          <Typography variant="caption" color="text.secondary">
            {t('duplicates.createdAt', '建立時間')}：{formatDateTime(member.createAt)}
          </Typography>
        )}
      </Stack>

      <Box sx={{ mb: 1.5 }}>
        {answer ? (
          <>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {t('duplicates.answerLabel', '答案')}
              </Typography>
              <Chip
                size="small"
                label={
                  answer.confirmed
                    ? t('duplicates.answerConfirmed', '已確認')
                    : t('duplicates.answerNotConfirmed', '尚未確認')
                }
                color={answer.confirmed ? 'success' : 'default'}
                variant={answer.confirmed ? 'filled' : 'outlined'}
              />
              {answer.divergenceFlag && answer.divergenceFlag !== 'consistent' && (
                <Chip
                  size="small"
                  label={t('duplicates.answerDivergentFlag', '與群組答案分歧')}
                  color="warning"
                  variant="outlined"
                />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
              {answer.text?.length > 200 ? `${answer.text.slice(0, 200)}…` : answer.text}
            </Typography>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary">
            {t('duplicates.answerNone', '尚未產生答案')}
          </Typography>
        )}
      </Box>

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<OpenInNewIcon />}
          component="a"
          href={`/projects/${member.projectId}/questions?focus=${member.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('duplicates.viewOrEdit', '前往編輯／檢視')}
        </Button>
        {deletable ? (
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => setConfirmOpen(true)}
          >
            {t('duplicates.deleteThis', '刪除這筆')}
          </Button>
        ) : (
          <Tooltip title={lockReason} placement="top">
            <span>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                disabled
                startIcon={<LockOutlinedIcon />}
              >
                {t('duplicates.deleteLocked', '刪除已鎖定')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Stack>

      <Dialog open={confirmOpen} onClose={() => !deleting && setConfirmOpen(false)}>
        <DialogTitle>{t('duplicates.confirmDeleteTitle', '確認刪除這筆問題？')}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t(
              'duplicates.confirmDeleteBody',
              '刪除後將同時清除此問題的向量資料與群組關聯，且不可復原。'
            )}
          </DialogContentText>
          <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2">{member.question}</Typography>
          </Box>
          {error && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={deleting}>
            {t('common.cancel', '取消')}
          </Button>
          <Button onClick={doDelete} color="error" disabled={deleting}>
            {deleting ? t('common.deleting', '刪除中…') : t('common.delete', '刪除')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
