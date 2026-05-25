'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, Box, Typography, LinearProgress, Paper, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// 日誌緩衝區大小限制，防止記憶體溢位
const MAX_LOGS = 100;

/**
 * 全自動蒸餾進度元件
 * @param {Object} props
 * @param {boolean} props.open - 對話方塊是否開啟
 * @param {Function} props.onClose - 關閉對話方塊的回撥
 * @param {Object} props.progress - 進度資訊
 */
export default function AutoDistillProgress({ open, onClose, progress = {} }) {
  const { t } = useTranslation();
  const logContainerRef = useRef(null);
  const [displayLogs, setDisplayLogs] = useState([]);

  // 限制日誌數量，只保留最新的MAX_LOGS條
  useEffect(() => {
    if (progress.logs) {
      setDisplayLogs(progress.logs.slice(-MAX_LOGS));
    }
  }, [progress.logs]);

  // 自動滾動到底部
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [displayLogs]);

  const getStageText = () => {
    const { stage } = progress;
    switch (stage) {
      case 'level1':
        return t('distill.stageBuildingLevel1');
      case 'level2':
        return t('distill.stageBuildingLevel2');
      case 'level3':
        return t('distill.stageBuildingLevel3');
      case 'level4':
        return t('distill.stageBuildingLevel4');
      case 'level5':
        return t('distill.stageBuildingLevel5');
      case 'questions':
        return t('distill.stageBuildingQuestions');
      case 'datasets':
        return t('distill.stageBuildingDatasets');
      case 'multi-turn-datasets':
        return t('distill.stageBuildingMultiTurnDatasets', { defaultValue: '生成多輪對話資料集中...' });
      case 'completed':
        return t('distill.stageCompleted');
      default:
        return t('distill.stageInitializing');
    }
  };

  const getOverallProgress = () => {
    const { tagsBuilt, tagsTotal, questionsBuilt, questionsTotal, datasetsBuilt, datasetsTotal } = progress;

    // 整體進度按比例計算：標籤構建佔30%，問題生成佔35%，資料集生成佔35%
    let tagProgress = tagsTotal ? (tagsBuilt / tagsTotal) * 30 : 0;
    let questionProgress = questionsTotal ? (questionsBuilt / questionsTotal) * 35 : 0;
    let datasetProgress = datasetsTotal ? (datasetsBuilt / datasetsTotal) * 35 : 0;

    return Math.min(100, Math.round(tagProgress + questionProgress + datasetProgress));
  };

  return (
    <Dialog
      open={open}
      onClose={progress.stage === 'completed' || !progress.stage ? onClose : null}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {t('distill.autoDistillProgress')}
          {(progress.stage === 'completed' || !progress.stage) && (
            <IconButton onClick={onClose} aria-label="close">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 1 }}>
          {/* 整體進度 */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('distill.overallProgress')}
            </Typography>

            <Box sx={{ mb: 2 }}>
              <LinearProgress variant="determinate" value={getOverallProgress()} sx={{ height: 10, borderRadius: 5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {getOverallProgress()}%
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: progress.multiTurnDatasetsTotal > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                gap: 2
              }}
            >
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('distill.tagsProgress')}
                </Typography>
                <Typography variant="h6">
                  {progress.tagsBuilt || 0} / {progress.tagsTotal || 0}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('distill.questionsProgress')}
                </Typography>
                <Typography variant="h6">
                  {progress.questionsBuilt || 0} / {progress.questionsTotal || 0}
                </Typography>
              </Paper>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('distill.datasetsProgress')}
                </Typography>
                <Typography variant="h6">
                  {progress.datasetsBuilt || 0} / {progress.datasetsTotal || 0}
                </Typography>
              </Paper>

              {progress.multiTurnDatasetsTotal > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('distill.multiTurnDatasetsProgress', { defaultValue: '多輪對話進度' })}
                  </Typography>
                  <Typography variant="h6">
                    {progress.multiTurnDatasetsBuilt || 0} / {progress.multiTurnDatasetsTotal || 0}
                  </Typography>
                </Paper>
              )}
            </Box>
          </Box>

          {/* 當前階段 */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              {t('distill.currentStage')}
            </Typography>

            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h6">{getStageText()}</Typography>
            </Paper>
          </Box>

          {/* 即時日誌 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {t('distill.realTimeLogs')}
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                maxHeight: 250,
                overflow: 'auto',
                bgcolor: 'grey.900',
                color: 'grey.100',
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }}
              ref={logContainerRef}
            >
              {displayLogs.length > 0 ? (
                displayLogs.map((log, index) => {
                  // 檢測成功日誌，顯示為綠色
                  let color = 'inherit';
                  if (log.includes('成功') || log.includes('完成') || log.includes('Successfully')) {
                    color = '#4caf50';
                  }
                  if (log.includes('失敗') || log.toLowerCase().includes('error')) {
                    color = '#f44336';
                  }
                  return (
                    <Box key={index} sx={{ mb: 0.5, color: color }}>
                      {log}
                    </Box>
                  );
                })
              ) : (
                <Typography variant="body2" color="grey.500">
                  {t('distill.waitingForLogs')}
                </Typography>
              )}
            </Paper>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
