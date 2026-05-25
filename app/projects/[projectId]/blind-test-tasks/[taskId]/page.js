'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import { useTranslation } from 'react-i18next';

import useBlindTestDetail from '../hooks/useBlindTestDetail';
import BlindTestHeader from '../components/BlindTestHeader';
import ResultSummary from '../components/ResultSummary';
import ResultDetailList from '../components/ResultDetailList';
import BlindTestInProgress from '../components/BlindTestInProgress';

export default function BlindTestDetailPage() {
  const { projectId, taskId } = useParams();
  const router = useRouter();
  const { t } = useTranslation();

  const {
    task,
    loading,
    error,
    setError,
    currentQuestion,
    leftAnswer,
    rightAnswer,
    answersLoading,
    streamingA,
    streamingB,
    voting,
    completed,
    fetchCurrentQuestion,
    submitVote,
    interruptTask,
    getResultStats
  } = useBlindTestDetail(projectId, taskId);

  const [interruptDialog, setInterruptDialog] = useState(false);

  const handleBack = () => router.push(`/projects/${projectId}/blind-test-tasks`);

  const handleVote = async vote => {
    await submitVote(vote);
  };

  const handleInterrupt = async () => {
    await interruptTask();
    setInterruptDialog(false);
  };

  // 載入中
  if (loading) {
    return (
      <Container
        maxWidth="xl"
        sx={{ py: 3, height: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress />
      </Container>
    );
  }

  // 任務不存在
  if (!task) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <BlindTestHeader title={t('blindTest.taskNotFound', '任務不存在')} onBack={handleBack} />
        <Alert severity="error">{t('blindTest.taskNotFound', '任務不存在')}</Alert>
      </Container>
    );
  }

  const isResultView = completed || task.status !== 0;
  const stats = getResultStats();

  // 結果展示頁面（已完成或已中斷）
  if (isResultView) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, height: 'calc(100vh - 64px)', overflow: 'auto' }}>
        <BlindTestHeader title={t('blindTest.resultTitle', '盲測結果')} status={task.status} onBack={handleBack} />

        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <ResultSummary stats={stats} modelInfo={task.modelInfo || '{}'} />
          <ResultDetailList task={task} />
        </Box>
      </Container>
    );
  }

  // 盲測進行中頁面
  return (
    <Container maxWidth="xl" sx={{ py: 3, height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <BlindTestHeader
        title={t('blindTest.inProgress', '盲測進行中')}
        onBack={handleBack}
        actions={
          <Button
            variant="outlined"
            color="warning"
            startIcon={<StopIcon />}
            onClick={() => setInterruptDialog(true)}
            size="small"
          >
            {t('blindTest.interrupt', '中斷任務')}
          </Button>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0 }}>
        <BlindTestInProgress
          task={task}
          currentQuestion={currentQuestion}
          leftAnswer={leftAnswer}
          rightAnswer={rightAnswer}
          streamingA={streamingA}
          streamingB={streamingB}
          answersLoading={answersLoading}
          voting={voting}
          onVote={handleVote}
          onReload={fetchCurrentQuestion}
        />
      </Box>

      {/* 中斷確認對話方塊 */}
      <Dialog open={interruptDialog} onClose={() => setInterruptDialog(false)}>
        <DialogTitle>{t('blindTest.interruptConfirmTitle', '確認中斷')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('blindTest.interruptConfirmMessage', '確定要中斷這個盲測任務嗎？已完成的評判結果將保留。')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterruptDialog(false)}>{t('common.cancel', '取消')}</Button>
          <Button color="warning" variant="contained" onClick={handleInterrupt}>
            {t('blindTest.interrupt', '中斷')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
