'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useTranslation } from 'react-i18next';

import useBlindTestTasks from './hooks/useBlindTestTasks';
import BlindTestTaskCard from './components/BlindTestTaskCard';
import CreateBlindTestDialog from './components/CreateBlindTestDialog';

export default function BlindTestTasksPage() {
  const { projectId } = useParams();
  const router = useRouter();
  const { t } = useTranslation();

  const {
    tasks,
    loading,
    error,
    setError,
    deleteTask,
    interruptTask,
    createTask,
    page,
    setPage,
    pageSize,
    setPageSize,
    total
  } = useBlindTestTasks(projectId);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, task: null });
  const [interruptDialog, setInterruptDialog] = useState({ open: false, task: null });

  const handleView = task => router.push(`/projects/${projectId}/blind-test-tasks/${task.id}`);
  const handleContinue = task => router.push(`/projects/${projectId}/blind-test-tasks/${task.id}`);
  const handleDelete = task => setDeleteDialog({ open: true, task });
  const handleInterrupt = task => setInterruptDialog({ open: true, task });

  const handlePageChange = (event, newPage) => {
    setPage(newPage + 1);
  };

  const handlePageSizeChange = event => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(1);
  };

  const confirmDelete = async () => {
    if (deleteDialog.task) {
      await deleteTask(deleteDialog.task.id);
    }
    setDeleteDialog({ open: false, task: null });
  };

  const confirmInterrupt = async () => {
    if (interruptDialog.task) {
      await interruptTask(interruptDialog.task.id);
    }
    setInterruptDialog({ open: false, task: null });
  };

  const handleCreate = async taskData => {
    const result = await createTask(taskData);
    if (result.success) {
      // 建立成功後跳轉到任務詳情頁開始盲測
      router.push(`/projects/${projectId}/blind-test-tasks/${result.data.id}`);
    }
    return result;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* 頁面標題 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CompareArrowsIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {t('blindTest.title', '人工盲測任務')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
          {t('blindTest.createTask', '建立任務')}
        </Button>
      </Box>

      {/* 錯誤提示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* 載入狀態 */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {/* 空狀態 */}
      {!loading && tasks.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 8,
            textAlign: 'center'
          }}
        >
          <CompareArrowsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {t('blindTest.noTasks', '暫無盲測任務')}
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
            {t('blindTest.noTasksHint', '建立盲測任務來對比兩個模型的回答品質')}
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateDialogOpen(true)}>
            {t('blindTest.createTask', '建立任務')}
          </Button>
        </Box>
      )}

      {/* 任務列表 */}
      {!loading && tasks.length > 0 && (
        <>
          <Grid container spacing={2}>
            {tasks.map(task => (
              <Grid item xs={12} key={task.id}>
                <BlindTestTaskCard
                  task={task}
                  onView={handleView}
                  onDelete={handleDelete}
                  onInterrupt={handleInterrupt}
                  onContinue={handleContinue}
                />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
            <TablePagination
              component="div"
              count={total}
              page={page - 1}
              onPageChange={handlePageChange}
              rowsPerPage={pageSize}
              onRowsPerPageChange={handlePageSizeChange}
              rowsPerPageOptions={[6, 12, 24, 48]}
              labelRowsPerPage={t('datasets.rowsPerPage', '每頁行數')}
            />
          </Box>
        </>
      )}

      {/* 建立對話方塊 */}
      <CreateBlindTestDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        projectId={projectId}
        onCreate={handleCreate}
      />

      {/* 刪除確認對話方塊 */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, task: null })}>
        <DialogTitle>{t('blindTest.deleteConfirmTitle', '確認刪除')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('blindTest.deleteConfirmMessage', '確定要刪除這個盲測任務嗎？此操作不可撤銷。')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, task: null })}>{t('common.cancel', '取消')}</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            {t('common.delete', '刪除')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 中斷確認對話方塊 */}
      <Dialog open={interruptDialog.open} onClose={() => setInterruptDialog({ open: false, task: null })}>
        <DialogTitle>{t('blindTest.interruptConfirmTitle', '確認中斷')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('blindTest.interruptConfirmMessage', '確定要中斷這個盲測任務嗎？已完成的評判結果將保留。')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInterruptDialog({ open: false, task: null })}>{t('common.cancel', '取消')}</Button>
          <Button color="warning" variant="contained" onClick={confirmInterrupt}>
            {t('blindTest.interrupt', '中斷')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
