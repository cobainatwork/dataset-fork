'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Paper,
  useTheme,
  Tooltip
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';

/**
 * 專案遷移對話方塊元件
 * @param {Object} props - 元件屬性
 * @param {boolean} props.open - 對話方塊是否開啟
 * @param {Function} props.onClose - 關閉對話方塊的回撥函式
 * @param {Array<string>} props.projectIds - 需要遷移的專案ID列表
 */
export default function MigrationDialog({ open, onClose, projectIds = [] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [migrating, setMigrating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [migratedCount, setMigratedCount] = useState(0);
  const [taskId, setTaskId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [processingIds, setProcessingIds] = useState([]);

  // 開啟專案目錄
  const handleOpenDirectory = async projectId => {
    try {
      setProcessingIds(prev => [...prev, projectId]);

      const response = await fetch('/api/projects/open-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('migration.openDirectoryFailed'));
      }

      // 成功開啟目錄，不需要特別處理
    } catch (err) {
      console.error('開啟目錄錯誤:', err);
      setError(err.message);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== projectId));
    }
  };

  // 刪除專案目錄
  const handleDeleteDirectory = async projectId => {
    try {
      if (!window.confirm(t('migration.confirmDelete'))) {
        return;
      }

      setProcessingIds(prev => [...prev, projectId]);

      const response = await fetch('/api/projects/delete-directory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ projectId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('migration.deleteDirectoryFailed'));
      }

      // 從列表中移除已刪除的專案
      const updatedProjectIds = projectIds.filter(id => id !== projectId);
      // 這裡我們不能直接修改 projectIds，因為它是從父元件傳入的
      // 但我們可以通知使用者介面重新整理
      window.location.reload();
    } catch (err) {
      console.error('刪除目錄錯誤:', err);
      setError(err.message);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== projectId));
    }
  };

  // 處理遷移操作
  const handleMigration = async () => {
    try {
      setMigrating(true);
      setError(null);
      setSuccess(false);
      setProgress(0);
      setStatusText(t('migration.starting'));

      // 呼叫非同步遷移介面啟動遷移任務
      const response = await fetch('/api/projects/migrate', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(t('migration.failed'));
      }

      const { success, taskId: newTaskId } = await response.json();

      if (!success || !newTaskId) {
        throw new Error(t('migration.startFailed'));
      }

      // 儲存任務ID
      setTaskId(newTaskId);
      setStatusText(t('migration.processing'));

      // 開始輪詢任務狀態
      await pollMigrationStatus(newTaskId);
    } catch (err) {
      console.error('遷移錯誤:', err);
      setError(err.message);
      setMigrating(false);
    }
  };

  // 輪詢遷移任務狀態
  const pollMigrationStatus = async id => {
    try {
      // 定義輪詢間隔（毫秒）
      const pollInterval = 1000;

      // 傳送請求獲取任務狀態
      const response = await fetch(`/api/projects/migrate?taskId=${id}`);

      if (!response.ok) {
        throw new Error(t('migration.statusFailed'));
      }

      const { success, task } = await response.json();

      if (!success || !task) {
        throw new Error(t('migration.taskNotFound'));
      }

      // 更新進度
      setProgress(task.progress || 0);

      // 根據任務狀態更新UI
      if (task.status === 'completed') {
        // 任務完成
        setMigratedCount(task.completed);
        setSuccess(true);
        setMigrating(false);
        setStatusText(t('migration.completed'));

        // 遷移成功後，延遲關閉對話方塊並重新整理頁面
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 2000);
      } else if (task.status === 'failed') {
        // 任務失敗
        throw new Error(task.error || t('migration.failed'));
      } else {
        // 任務仍在進行中，繼續輪詢
        setTimeout(() => pollMigrationStatus(id), pollInterval);

        // 更新狀態文字
        if (task.total > 0) {
          setStatusText(
            t('migration.progressStatus', {
              completed: task.completed || 0,
              total: task.total
            })
          );
        }
      }
    } catch (err) {
      console.error('獲取遷移狀態錯誤:', err);
      setError(err.message);
      setMigrating(false);
    }
  };

  return (
    <Dialog open={open} onClose={migrating ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        <WarningAmberIcon color="warning" />
        <Typography variant="h6">{t('migration.title')}</Typography>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('migration.success', { count: migratedCount })}
          </Alert>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        <Typography variant="body1" sx={{ mb: 2 }}>
          {t('migration.description')}
        </Typography>

        {projectIds.length > 0 && (
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {t('migration.projectsList')}:
            </Typography>
            <Paper variant="outlined" sx={{ maxHeight: 180, overflow: 'auto' }}>
              <List dense>
                {projectIds.map(id => (
                  <ListItem key={id}>
                    <ListItemText primary={id} />
                    <ListItemSecondaryAction>
                      <Tooltip title={t('migration.openDirectory')}>
                        <IconButton
                          edge="end"
                          aria-label="open"
                          onClick={() => handleOpenDirectory(id)}
                          disabled={processingIds.includes(id)}
                          size="small"
                        >
                          <FolderOpenIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('migration.deleteDirectory')}>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleDeleteDirectory(id)}
                          disabled={processingIds.includes(id)}
                          size="small"
                          sx={{ ml: 1, color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        )}

        {migrating && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', my: 3, gap: 1.5 }}>
            <CircularProgress variant={progress > 0 ? 'determinate' : 'indeterminate'} value={progress} />
            <Typography variant="body2" color="text.secondary">
              {statusText || t('migration.migrating')}
            </Typography>
            {progress > 0 && (
              <Typography variant="body2" color="text.secondary">
                {progress}%
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={migrating}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleMigration} variant="contained" color="primary" disabled={migrating || success}>
          {migrating ? t('migration.migrating') : t('migration.migrate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
