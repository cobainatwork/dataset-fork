'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { selectedModelInfoAtom } from '@/lib/store';
import { Box, Typography, Paper, Container, Button, CircularProgress, Alert, IconButton, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import DistillTreeView from '@/components/distill/DistillTreeView';
import TagGenerationDialog from '@/components/distill/TagGenerationDialog';
import QuestionGenerationDialog from '@/components/distill/QuestionGenerationDialog';
import AutoDistillDialog from '@/components/distill/AutoDistillDialog';
import AutoDistillProgress from '@/components/distill/AutoDistillProgress';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { autoDistillService } from './autoDistillService';
import axios from 'axios';
import { toast } from 'sonner';

/**
 * 將 progressUpdate 轉化為帶有增量標記的快照物件
 */
function buildProgressSnapshot(update) {
  const snap = { ...update };
  if (update.updateType === 'increment') {
    if (update.tagsBuilt != null) snap._tagsBuiltIncrement = true;
    if (update.questionsBuilt != null) snap._questionsBuiltIncrement = true;
    if (update.datasetsBuilt != null) snap._datasetsBuiltIncrement = true;
    if (update.multiTurnDatasetsBuilt != null) snap._multiTurnIncrement = true;
  }
  return snap;
}

/**
 * 將新的 progressUpdate 合併到已有快照中（累加增量欄位，覆蓋絕對值欄位）
 */
function mergeProgressUpdate(prev, update) {
  const next = { ...prev };
  if (update.stage) next.stage = update.stage;
  if (update.tagsTotal) next.tagsTotal = update.tagsTotal;
  if (update.questionsTotal) next.questionsTotal = update.questionsTotal;
  if (update.datasetsTotal) next.datasetsTotal = update.datasetsTotal;
  if (update.multiTurnDatasetsTotal) next.multiTurnDatasetsTotal = update.multiTurnDatasetsTotal;

  const isIncrement = update.updateType === 'increment';

  if (update.tagsBuilt != null) {
    if (isIncrement) {
      // 增量模式：無論是否已有增量標記，都累加
      next.tagsBuilt = (prev.tagsBuilt || 0) + update.tagsBuilt;
      next._tagsBuiltIncrement = true;
    } else {
      next.tagsBuilt = update.tagsBuilt;
      next._tagsBuiltIncrement = false;
    }
  }
  if (update.questionsBuilt != null) {
    if (isIncrement) {
      next.questionsBuilt = (prev.questionsBuilt || 0) + update.questionsBuilt;
      next._questionsBuiltIncrement = true;
    } else {
      next.questionsBuilt = update.questionsBuilt;
      next._questionsBuiltIncrement = false;
    }
  }
  if (update.datasetsBuilt != null) {
    if (isIncrement) {
      next.datasetsBuilt = (prev.datasetsBuilt || 0) + update.datasetsBuilt;
      next._datasetsBuiltIncrement = true;
    } else {
      next.datasetsBuilt = update.datasetsBuilt;
      next._datasetsBuiltIncrement = false;
    }
  }
  if (update.multiTurnDatasetsBuilt != null) {
    if (isIncrement) {
      next.multiTurnDatasetsBuilt = (prev.multiTurnDatasetsBuilt || 0) + update.multiTurnDatasetsBuilt;
      next._multiTurnIncrement = true;
    } else {
      next.multiTurnDatasetsBuilt = update.multiTurnDatasetsBuilt;
      next._multiTurnIncrement = false;
    }
  }
  return next;
}

export default function DistillPage() {
  const { t, i18n } = useTranslation();
  const { projectId } = useParams();
  const selectedModel = useAtomValue(selectedModelInfoAtom);

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tags, setTags] = useState([]);
  // 問題列表狀態提升到 page 層，供 DistillTreeView 直接使用，避免重複請求
  const [distillQuestions, setDistillQuestions] = useState(null);

  // 標籤生成對話方塊相關狀態
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedTagPath, setSelectedTagPath] = useState('');

  // 自動蒸餾相關狀態
  const [autoDistillDialogOpen, setAutoDistillDialogOpen] = useState(false);
  const [autoDistillProgressOpen, setAutoDistillProgressOpen] = useState(false);
  const [autoDistillRunning, setAutoDistillRunning] = useState(false);
  const [distillStats, setDistillStats] = useState({
    tagsCount: 0,
    questionsCount: 0,
    datasetsCount: 0,
    multiTurnDatasetsCount: 0
  });
  const [distillProgress, setDistillProgress] = useState({
    stage: 'initializing',
    tagsTotal: 0,
    tagsBuilt: 0,
    questionsTotal: 0,
    questionsBuilt: 0,
    datasetsTotal: 0,
    datasetsBuilt: 0,
    multiTurnDatasetsTotal: 0, // 新增多輪對話資料集總數
    multiTurnDatasetsBuilt: 0, // 新增多輪對話資料集已生成數
    logs: []
  });

  const treeViewRef = useRef(null);

  // 用於批次緩衝日誌和進度更新，避免高併發時頻繁 setState 卡死頁面
  const pendingLogsRef = useRef([]);
  const pendingProgressRef = useRef(null);
  const batchTimerRef = useRef(null);

  // 啟動批次重新整理定時器（每300ms合併一次更新到 state）
  const startBatchTimer = useCallback(() => {
    if (batchTimerRef.current) return;
    batchTimerRef.current = setInterval(() => {
      const hasPendingLogs = pendingLogsRef.current.length > 0;
      const hasPendingProgress = pendingProgressRef.current !== null;
      if (!hasPendingLogs && !hasPendingProgress) return;

      const logsSnapshot = pendingLogsRef.current;
      const progressSnapshot = pendingProgressRef.current;
      pendingLogsRef.current = [];
      pendingProgressRef.current = null;

      setDistillProgress(prev => {
        let next = { ...prev };

        // 合併進度更新
        if (progressSnapshot) {
          if (progressSnapshot.stage) next.stage = progressSnapshot.stage;
          if (progressSnapshot.tagsTotal) next.tagsTotal = progressSnapshot.tagsTotal;
          if (progressSnapshot.tagsBuilt != null) {
            next.tagsBuilt = progressSnapshot._tagsBuiltIncrement
              ? (prev.tagsBuilt || 0) + progressSnapshot.tagsBuilt
              : progressSnapshot.tagsBuilt;
          }
          if (progressSnapshot.questionsTotal) next.questionsTotal = progressSnapshot.questionsTotal;
          if (progressSnapshot.questionsBuilt != null) {
            next.questionsBuilt = progressSnapshot._questionsBuiltIncrement
              ? (prev.questionsBuilt || 0) + progressSnapshot.questionsBuilt
              : progressSnapshot.questionsBuilt;
          }
          if (progressSnapshot.datasetsTotal) next.datasetsTotal = progressSnapshot.datasetsTotal;
          if (progressSnapshot.datasetsBuilt != null) {
            next.datasetsBuilt = progressSnapshot._datasetsBuiltIncrement
              ? (prev.datasetsBuilt || 0) + progressSnapshot.datasetsBuilt
              : progressSnapshot.datasetsBuilt;
          }
          if (progressSnapshot.multiTurnDatasetsTotal)
            next.multiTurnDatasetsTotal = progressSnapshot.multiTurnDatasetsTotal;
          if (progressSnapshot.multiTurnDatasetsBuilt != null) {
            next.multiTurnDatasetsBuilt = progressSnapshot._multiTurnIncrement
              ? (prev.multiTurnDatasetsBuilt || 0) + progressSnapshot.multiTurnDatasetsBuilt
              : progressSnapshot.multiTurnDatasetsBuilt;
          }
        }

        // 合併日誌，最多保留200條
        if (logsSnapshot.length > 0) {
          const merged = [...prev.logs, ...logsSnapshot];
          next.logs = merged.length > 200 ? merged.slice(-200) : merged;
        }

        return next;
      });
    }, 300);
  }, []);

  // 停止批次重新整理定時器
  const stopBatchTimer = useCallback(() => {
    if (batchTimerRef.current) {
      clearInterval(batchTimerRef.current);
      batchTimerRef.current = null;
    }
  }, []);

  // 獲取專案資訊和標籤列表
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchTags();
      fetchDistillStats();
    }
  }, [projectId]);

  // 監聽多輪對話資料集重新整理事件
  useEffect(() => {
    const handleRefreshStats = () => {
      fetchDistillStats();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('refreshDistillStats', handleRefreshStats);

      return () => {
        window.removeEventListener('refreshDistillStats', handleRefreshStats);
      };
    }
  }, [projectId]);

  // 獲取專案資訊
  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('獲取專案資訊失敗:', error);
      setError(t('common.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  // 獲取標籤列表
  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/distill/tags/all`);
      setTags(response.data);
    } catch (error) {
      console.error('獲取標籤列表失敗:', error);
      setError(t('common.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  // 獲取蒸餾統計資訊
  const fetchDistillStats = async () => {
    try {
      // 獲取標籤數量（複用 fetchTags 已有資料時可跳過，此處保留獨立請求以保證統計準確）
      const tagsResponse = await axios.get(`/api/projects/${projectId}/distill/tags/all`);
      const tagsCount = tagsResponse.data.length;

      // 獲取問題數量（同時儲存到 distillQuestions，供 DistillTreeView 直接使用）
      const questionsResponse = await axios.get(`/api/projects/${projectId}/questions/tree?isDistill=true`);
      const questionsData = questionsResponse.data;
      const questionsCount = questionsData.length;
      setDistillQuestions(questionsData);

      // 獲取資料集數量
      const datasetsCount = questionsData.filter(q => q.answered).length;

      // 獲取多輪對話資料集數量
      let multiTurnDatasetsCount = 0;
      try {
        const conversationsResponse = await axios.get(
          `/api/projects/${projectId}/dataset-conversations?getAllIds=true`
        );
        multiTurnDatasetsCount = (conversationsResponse.data.allConversationIds || []).length;
      } catch (error) {
        console.log('獲取多輪對話資料集統計失敗，可能是API不存在:', error.message);
      }

      setDistillStats({
        tagsCount,
        questionsCount,
        datasetsCount,
        multiTurnDatasetsCount
      });
    } catch (error) {
      console.error('獲取蒸餾統計資訊失敗:', error);
    }
  };

  // 開啟生成標籤對話方塊
  const handleOpenTagDialog = (tag = null, tagPath = '') => {
    if (!selectedModel || Object.keys(selectedModel).length === 0) {
      setError(t('distill.selectModelFirst'));
      return;
    }
    setSelectedTag(tag);
    setSelectedTagPath(tagPath);
    setTagDialogOpen(true);
  };

  // 開啟生成問題對話方塊
  const handleOpenQuestionDialog = (tag, tagPath) => {
    if (!selectedModel || Object.keys(selectedModel).length === 0) {
      setError(t('distill.selectModelFirst'));
      return;
    }
    setSelectedTag(tag);
    setSelectedTagPath(tagPath);
    setQuestionDialogOpen(true);
  };

  // 處理標籤生成完成
  const handleTagGenerated = () => {
    fetchTags(); // 重新獲取標籤列表
    setTagDialogOpen(false);
  };

  // 處理問題生成完成
  const handleQuestionGenerated = () => {
    // 關閉對話方塊
    setQuestionDialogOpen(false);

    // 重新整理標籤資料和統計資訊（fetchDistillStats 內部已同步更新 distillQuestions）
    fetchTags();
    fetchDistillStats();
  };

  // 開啟自動蒸餾對話方塊
  const handleOpenAutoDistillDialog = () => {
    if (!selectedModel || Object.keys(selectedModel).length === 0) {
      setError(t('distill.selectModelFirst'));
      return;
    }
    setAutoDistillDialogOpen(true);
  };

  // 開始自動蒸餾任務（前臺執行）
  const handleStartAutoDistill = async config => {
    setAutoDistillDialogOpen(false);
    setAutoDistillProgressOpen(true);
    setAutoDistillRunning(true);

    // 啟動批次重新整理定時器
    startBatchTimer();

    // 初始化進度資訊
    setDistillProgress({
      stage: 'initializing',
      tagsTotal: config.estimatedTags,
      tagsBuilt: distillStats.tagsCount || 0,
      questionsTotal: config.estimatedQuestions,
      questionsBuilt: distillStats.questionsCount || 0,
      datasetsTotal: config.estimatedQuestions, // 初步設定資料集總數為問題數，後面會更新
      datasetsBuilt: distillStats.datasetsCount || 0, // 根據當前已生成的資料集數量初始化
      multiTurnDatasetsTotal:
        config.datasetType === 'multi-turn' || config.datasetType === 'both' ? config.estimatedQuestions : 0,
      multiTurnDatasetsBuilt: distillStats.multiTurnDatasetsCount || 0,
      logs: [t('distill.autoDistillStarted', { time: new Date().toLocaleTimeString() })]
    });

    try {
      // 檢查模型是否存在
      if (!selectedModel || Object.keys(selectedModel).length === 0) {
        addLog(t('distill.selectModelFirst'));
        stopBatchTimer();
        flushPendingUpdates();
        setAutoDistillRunning(false);
        return;
      }

      // 使用 autoDistillService 執行蒸餾任務
      await autoDistillService.executeDistillTask({
        projectId,
        topic: config.topic,
        levels: config.levels,
        tagsPerLevel: config.tagsPerLevel,
        questionsPerTag: config.questionsPerTag,
        datasetType: config.datasetType, // 新增資料集型別引數
        model: selectedModel,
        language: i18n.language,
        concurrencyLimit: project?.taskConfig?.concurrencyLimit || 5, // 從專案配置中獲取併發限制
        onProgress: updateProgress,
        onLog: addLog
      });

      // 停止批次重新整理定時器，最後flush一次確保所有更新到位
      stopBatchTimer();
      // 強制flush剩餘緩衝
      flushPendingUpdates();
      setAutoDistillRunning(false);
    } catch (error) {
      console.error('自動蒸餾任務執行失敗:', error);
      stopBatchTimer();
      addLog(t('distill.taskExecutionError', { error: error.message || t('common.unknownError') }));
      flushPendingUpdates();
      setAutoDistillRunning(false);
    }
  };

  // 開始自動蒸餾任務（後臺執行）
  const handleStartAutoDistillBackground = async config => {
    setAutoDistillDialogOpen(false);

    try {
      // 檢查模型是否存在
      if (!selectedModel || Object.keys(selectedModel).length === 0) {
        setError(t('distill.selectModelFirst'));
        return;
      }

      // 建立後臺任務
      const response = await axios.post(`/api/projects/${projectId}/tasks`, {
        taskType: 'data-distillation',
        modelInfo: selectedModel,
        language: i18n.language,
        detail: t('distill.autoDistillTaskDetail', { topic: config.topic }),
        totalCount: config.estimatedQuestions,
        note: {
          topic: config.topic,
          levels: config.levels,
          tagsPerLevel: config.tagsPerLevel,
          questionsPerTag: config.questionsPerTag,
          datasetType: config.datasetType,
          estimatedTags: config.estimatedTags,
          estimatedQuestions: config.estimatedQuestions
        }
      });

      if (response.data.code === 0) {
        toast.success(t('distill.backgroundTaskCreated'));
        // 3秒後重新整理統計資訊
        setTimeout(() => {
          fetchDistillStats();
        }, 3000);
      } else {
        toast.error(response.data.message || t('distill.backgroundTaskFailed'));
      }
    } catch (error) {
      console.error('建立後臺蒸餾任務失敗:', error);
      toast.error(error.message || t('distill.backgroundTaskFailed'));
    }
  };

  // 立即將緩衝區剩餘內容重新整理到 state（任務結束時呼叫）
  const flushPendingUpdates = useCallback(() => {
    const logsSnapshot = pendingLogsRef.current;
    const progressSnapshot = pendingProgressRef.current;
    pendingLogsRef.current = [];
    pendingProgressRef.current = null;
    if (logsSnapshot.length === 0 && progressSnapshot === null) return;
    setDistillProgress(prev => {
      let next = { ...prev };
      if (progressSnapshot) {
        if (progressSnapshot.stage) next.stage = progressSnapshot.stage;
        if (progressSnapshot.tagsTotal) next.tagsTotal = progressSnapshot.tagsTotal;
        if (progressSnapshot.tagsBuilt != null) {
          next.tagsBuilt = progressSnapshot._tagsBuiltIncrement
            ? (prev.tagsBuilt || 0) + progressSnapshot.tagsBuilt
            : progressSnapshot.tagsBuilt;
        }
        if (progressSnapshot.questionsTotal) next.questionsTotal = progressSnapshot.questionsTotal;
        if (progressSnapshot.questionsBuilt != null) {
          next.questionsBuilt = progressSnapshot._questionsBuiltIncrement
            ? (prev.questionsBuilt || 0) + progressSnapshot.questionsBuilt
            : progressSnapshot.questionsBuilt;
        }
        if (progressSnapshot.datasetsTotal) next.datasetsTotal = progressSnapshot.datasetsTotal;
        if (progressSnapshot.datasetsBuilt != null) {
          next.datasetsBuilt = progressSnapshot._datasetsBuiltIncrement
            ? (prev.datasetsBuilt || 0) + progressSnapshot.datasetsBuilt
            : progressSnapshot.datasetsBuilt;
        }
        if (progressSnapshot.multiTurnDatasetsTotal)
          next.multiTurnDatasetsTotal = progressSnapshot.multiTurnDatasetsTotal;
        if (progressSnapshot.multiTurnDatasetsBuilt != null) {
          next.multiTurnDatasetsBuilt = progressSnapshot._multiTurnIncrement
            ? (prev.multiTurnDatasetsBuilt || 0) + progressSnapshot.multiTurnDatasetsBuilt
            : progressSnapshot.multiTurnDatasetsBuilt;
        }
      }
      if (logsSnapshot.length > 0) {
        const merged = [...prev.logs, ...logsSnapshot];
        next.logs = merged.length > 200 ? merged.slice(-200) : merged;
      }
      return next;
    });
  }, []);

  // 更新進度 - 寫入緩衝區，由定時器批次重新整理到 state，避免高併發時頻繁渲染
  const updateProgress = useCallback(progressUpdate => {
    pendingProgressRef.current = pendingProgressRef.current
      ? mergeProgressUpdate(pendingProgressRef.current, progressUpdate)
      : buildProgressSnapshot(progressUpdate);
  }, []);

  // 新增日誌 - 寫入緩衝區，由定時器批次重新整理
  const addLog = useCallback(message => {
    pendingLogsRef.current.push(message);
  }, []);

  // 關閉進度對話方塊
  const handleCloseProgressDialog = () => {
    if (!autoDistillRunning) {
      setAutoDistillProgressOpen(false);
      // 重新整理資料（fetchDistillStats 內部已同步更新 distillQuestions）
      fetchTags();
      fetchDistillStats();
    } else {
      // 如果任務還在執行，可以展示一個確認對話方塊
      // 這裡簡化處理，直接關閉
      setAutoDistillProgressOpen(false);
    }
  };

  if (!projectId) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{t('common.projectIdRequired')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Box
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, paddingLeft: '32px' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" component="h1" fontWeight="bold">
              {t('distill.title')}
            </Typography>
            <Tooltip title={t('common.help')}>
              <IconButton
                size="small"
                onClick={() => {
                  const helpUrl =
                    i18n.language === 'en'
                      ? 'https://docs.easy-dataset.com/ed/en/advanced/images-and-media'
                      : 'https://docs.easy-dataset.com/jin-jie-shi-yong/images-and-media';
                  window.open(helpUrl, '_blank');
                }}
                sx={{ color: 'text.secondary' }}
              >
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              onClick={handleOpenAutoDistillDialog}
              disabled={!selectedModel}
              startIcon={<AutoFixHighIcon />}
              sx={{ px: 3, py: 1 }}
            >
              {t('distill.autoDistillButton')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={() => handleOpenTagDialog(null)}
              disabled={!selectedModel}
              startIcon={<AddIcon />}
              sx={{ px: 3, py: 1 }}
            >
              {t('distill.generateRootTags')}
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4, px: 3, py: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <DistillTreeView
              ref={treeViewRef}
              projectId={projectId}
              tags={tags}
              initialQuestions={distillQuestions}
              onGenerateSubTags={handleOpenTagDialog}
              onGenerateQuestions={handleOpenQuestionDialog}
              onTagsUpdate={setTags}
            />
          </Box>
        )}
      </Paper>

      {/* 生成標籤對話方塊 */}
      {tagDialogOpen && (
        <TagGenerationDialog
          open={tagDialogOpen}
          onClose={() => setTagDialogOpen(false)}
          onGenerated={handleTagGenerated}
          projectId={projectId}
          parentTag={selectedTag}
          tagPath={selectedTagPath}
          model={selectedModel}
        />
      )}

      {/* 生成問題對話方塊 */}
      {questionDialogOpen && (
        <QuestionGenerationDialog
          open={questionDialogOpen}
          onClose={() => setQuestionDialogOpen(false)}
          onGenerated={handleQuestionGenerated}
          projectId={projectId}
          tag={selectedTag}
          tagPath={selectedTagPath}
          model={selectedModel}
        />
      )}

      {/* 全自動蒸餾資料集配置對話方塊 */}
      <AutoDistillDialog
        open={autoDistillDialogOpen}
        onClose={() => setAutoDistillDialogOpen(false)}
        onStart={handleStartAutoDistill}
        onStartBackground={handleStartAutoDistillBackground}
        projectId={projectId}
        project={project}
        stats={distillStats}
      />

      {/* 全自動蒸餾進度對話方塊 */}
      <AutoDistillProgress
        open={autoDistillProgressOpen}
        onClose={handleCloseProgressDialog}
        progress={distillProgress}
      />
    </Container>
  );
}
