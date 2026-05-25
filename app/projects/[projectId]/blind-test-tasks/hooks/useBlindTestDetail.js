'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * 盲測任務詳情和盲測過程管理 Hook
 */
export default function useBlindTestDetail(projectId, taskId) {
  // 任務詳情
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 當前題目狀態
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [leftAnswer, setLeftAnswer] = useState(null);
  const [rightAnswer, setRightAnswer] = useState(null);
  const [isSwapped, setIsSwapped] = useState(false);
  const [answersLoading, setAnswersLoading] = useState(false);

  // 流式輸出狀態
  const [streamingA, setStreamingA] = useState(false);
  const [streamingB, setStreamingB] = useState(false);
  const abortControllerRef = useRef(null);
  const hasAutoLoadedRef = useRef(false);

  // 投票狀態
  const [voting, setVoting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // 載入任務詳情
  const loadTask = useCallback(
    async (silent = false) => {
      if (!projectId || !taskId) return;

      try {
        if (!silent) setLoading(true);
        setError('');
        // 新增時間戳防止快取
        const response = await fetch(`/api/projects/${projectId}/blind-test-tasks/${taskId}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache'
          }
        });
        const result = await response.json();

        if (result.code === 0) {
          console.log('任務狀態更新:', result.data.completedCount, '/', result.data.totalCount);
          setTask(result.data);
          // 檢查任務是否已完成 (0=進行中, 1=已完成, 2=失敗, 3=已中斷)
          if (result.data.status !== 0) {
            setCompleted(true);
          }
        } else {
          if (!silent) setError(result.error || '載入任務詳情失敗');
        }
      } catch (err) {
        console.error('載入任務詳情失敗:', err);
        if (!silent) setError('載入任務詳情失敗');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [projectId, taskId]
  );

  // 流式獲取當前題目和模型回答
  const fetchCurrentQuestion = useCallback(async () => {
    if (!projectId || !taskId) return;

    // 取消上一次的請求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setAnswersLoading(true);
      setError('');
      setCurrentQuestion(null);
      setLeftAnswer({ fullContent: '', content: '', thinking: '', isThinking: false, duration: 0, error: null });
      setRightAnswer({ fullContent: '', content: '', thinking: '', isThinking: false, duration: 0, error: null });

      // 1. 先獲取題目資訊
      const questionRes = await fetch(`/api/projects/${projectId}/blind-test-tasks/${taskId}/question`, {
        signal: controller.signal,
        cache: 'no-store'
      });

      if (!questionRes.ok) throw new Error('獲取題目失敗');

      const questionData = await questionRes.json();

      if (questionData.completed) {
        setCompleted(true);
        return;
      }

      setCurrentQuestion({
        id: questionData.questionId,
        question: questionData.question,
        answer: questionData.answer,
        index: questionData.questionIndex,
        total: questionData.totalQuestions
      });
      setIsSwapped(questionData.isSwapped);
      setCompleted(false);

      // 2. 並行呼叫兩個模型的流式介面
      setStreamingA(true);
      setStreamingB(true);

      const processStream = async (modelType, setAnswer, setStreaming) => {
        const modelStartTime = Date.now();
        try {
          const streamUrl = `/api/projects/${projectId}/blind-test-tasks/${taskId}/stream-model?model=${modelType}`;
          const response = await fetch(streamUrl, {
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`模型${modelType}呼叫失敗: ${response.status}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          let fullContent = '';
          let currentContent = '';
          let currentThinking = '';
          let isInThinking = false;
          let pendingBuffer = ''; // 用於處理跨 chunk 的標籤識別

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            pendingBuffer += chunk;

            // 處理緩衝區中的內容
            while (pendingBuffer.length > 0) {
              // 如果正在思考中，尋找結束標籤
              if (isInThinking) {
                const endTagIndex = pendingBuffer.indexOf('</think>');
                if (endTagIndex !== -1) {
                  const thinkingPart = pendingBuffer.substring(0, endTagIndex);
                  currentThinking += thinkingPart;
                  fullContent += thinkingPart + '</think>';
                  isInThinking = false;
                  pendingBuffer = pendingBuffer.substring(endTagIndex + 8);
                  continue;
                } else {
                  // 沒有找到結束標籤，但可能緩衝區末尾包含了部分結束標籤
                  // 保留最後 7 個字元（"</think>" 長度為 8）以防被截斷
                  const safeLength = Math.max(0, pendingBuffer.length - 7);
                  const processingPart = pendingBuffer.substring(0, safeLength);
                  currentThinking += processingPart;
                  fullContent += processingPart;
                  pendingBuffer = pendingBuffer.substring(safeLength);
                  break; // 等待下一個 chunk
                }
              } else {
                // 不在思考中，尋找開始標籤
                const startTagIndex = pendingBuffer.indexOf('<think>');
                if (startTagIndex !== -1) {
                  const contentPart = pendingBuffer.substring(0, startTagIndex);
                  currentContent += contentPart;
                  fullContent += contentPart + '<think>';
                  isInThinking = true;
                  pendingBuffer = pendingBuffer.substring(startTagIndex + 7);
                  continue;
                } else {
                  // 沒有找到開始標籤，保留最後 6 個字元以防開始標籤被截斷
                  const safeLength = Math.max(0, pendingBuffer.length - 6);
                  const processingPart = pendingBuffer.substring(0, safeLength);
                  currentContent += processingPart;
                  fullContent += processingPart;
                  pendingBuffer = pendingBuffer.substring(safeLength);
                  break; // 等待下一個 chunk
                }
              }
            }

            setAnswer(prev => ({
              ...prev,
              fullContent,
              content: currentContent,
              thinking: currentThinking,
              isThinking: isInThinking
            }));
          }

          const modelDuration = Date.now() - modelStartTime;
          setAnswer(prev => ({ ...prev, duration: modelDuration }));
          setStreaming(false);
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.error(`模型${modelType}錯誤:`, err);
          const modelDuration = Date.now() - modelStartTime;
          setAnswer(prev => ({
            ...prev,
            error: err.message,
            duration: modelDuration
          }));
          setStreaming(false);
        }
      };

      // 根據是否交換決定左右對應的模型
      const leftModel = questionData.isSwapped ? 'B' : 'A';
      const rightModel = questionData.isSwapped ? 'A' : 'B';

      await Promise.all([
        processStream(leftModel, setLeftAnswer, setStreamingA),
        processStream(rightModel, setRightAnswer, setStreamingB)
      ]);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('獲取題目失敗:', err);
      setError(err.message || '獲取當前題目失敗');
      setStreamingA(false);
      setStreamingB(false);
    } finally {
      // 只有當前請求未被取消時才重置loading
      if (abortControllerRef.current === controller) {
        setAnswersLoading(false);
      }
    }
  }, [projectId, taskId]);

  // 提交投票
  const submitVote = useCallback(
    async vote => {
      if (!projectId || !taskId || !currentQuestion) return { success: false };

      try {
        setVoting(true);
        setError('');

        const response = await fetch(`/api/projects/${projectId}/blind-test-tasks/${taskId}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vote,
            questionId: currentQuestion.id,
            isSwapped,
            // 使用 fullContent 提交，包含思考過程
            leftAnswer: leftAnswer?.fullContent || leftAnswer?.content || '',
            rightAnswer: rightAnswer?.fullContent || rightAnswer?.content || ''
          })
        });

        const result = await response.json();

        if (result.code === 0) {
          // 等待任務狀態更新（進度條）
          await loadTask(true);

          if (result.data.isCompleted) {
            setCompleted(true);
          } else {
            // 獲取下一題
            await fetchCurrentQuestion();
          }
          return { success: true, data: result.data };
        } else {
          setError(result.error || '提交投票失敗');
          return { success: false, error: result.error };
        }
      } catch (err) {
        console.error('提交投票失敗:', err);
        setError('提交投票失敗');
        return { success: false, error: '提交投票失敗' };
      } finally {
        setVoting(false);
      }
    },
    [projectId, taskId, currentQuestion, isSwapped, leftAnswer, rightAnswer, loadTask, fetchCurrentQuestion]
  );

  // 中斷任務
  const interruptTask = useCallback(async () => {
    if (!projectId || !taskId) return false;

    try {
      const response = await fetch(`/api/projects/${projectId}/blind-test-tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'interrupt' })
      });

      const result = await response.json();

      if (result.code === 0) {
        setCompleted(true);
        loadTask();
        return true;
      } else {
        setError(result.error || '中斷任務失敗');
        return false;
      }
    } catch (err) {
      console.error('中斷任務失敗:', err);
      setError('中斷任務失敗');
      return false;
    }
  }, [projectId, taskId, loadTask]);

  // 初始載入
  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // 任務載入完成後，如果任務進行中，自動獲取當前題目（只執行一次）
  useEffect(() => {
    if (task && task.status === 0 && !completed && !hasAutoLoadedRef.current && projectId && taskId) {
      hasAutoLoadedRef.current = true;
      fetchCurrentQuestion();
    }
  }, [task, completed, projectId, taskId, fetchCurrentQuestion]);

  // 計算結果統計
  const getResultStats = useCallback(() => {
    if (!task?.detail?.results) return null;

    const results = task.detail.results;
    const totalModelAScore = results.reduce((sum, r) => sum + (r.modelAScore || 0), 0);
    const totalModelBScore = results.reduce((sum, r) => sum + (r.modelBScore || 0), 0);

    const leftWins = results.filter(r => r.vote === 'left').length;
    const rightWins = results.filter(r => r.vote === 'right').length;
    const bothGood = results.filter(r => r.vote === 'both_good').length;
    const bothBad = results.filter(r => r.vote === 'both_bad').length;

    // 計算實際模型勝出次數（需要考慮 swap）
    const modelAWins = results.filter(r => {
      if (r.vote === 'left' && !r.isSwapped) return true;
      if (r.vote === 'right' && r.isSwapped) return true;
      return false;
    }).length;

    const modelBWins = results.filter(r => {
      if (r.vote === 'left' && r.isSwapped) return true;
      if (r.vote === 'right' && !r.isSwapped) return true;
      return false;
    }).length;

    return {
      totalQuestions: results.length,
      modelAScore: totalModelAScore,
      modelBScore: totalModelBScore,
      modelAWins,
      modelBWins,
      ties: bothGood + bothBad,
      bothGood,
      bothBad,
      leftWins,
      rightWins
    };
  }, [task]);

  // 元件解除安裝時取消請求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // 任務詳情
    task,
    loading,
    error,
    setError,
    loadTask,

    // 當前題目狀態
    currentQuestion,
    leftAnswer,
    rightAnswer,
    answersLoading,

    // 流式狀態
    streamingA,
    streamingB,

    // 投票狀態
    voting,
    completed,

    // 操作
    fetchCurrentQuestion,
    submitVote,
    interruptTask,

    // 結果統計
    getResultStats
  };
}
