'use client';

import { useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import axios from 'axios';

export function useQuestionsFilter(projectId) {
  // 過濾和搜尋狀態
  const [answerFilter, setAnswerFilter] = useState('all'); // 'all', 'answered', 'unanswered'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMatchMode, setSearchMatchMode] = useState('match'); // 'match', 'notMatch'
  const [chunkNameFilter, setChunkNameFilter] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState('all'); // 'all', 'text', 'image'
  const debouncedSearchTerm = useDebounce(searchTerm);
  const debouncedChunkNameFilter = useDebounce(chunkNameFilter);

  // 選擇狀態
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // 處理問題選擇
  const handleSelectQuestion = (questionKey, newSelected) => {
    if (newSelected) {
      // 處理批次選擇的情況
      setSelectedQuestions(newSelected);
    } else {
      // 處理單個問題選擇的情況
      setSelectedQuestions(prev => {
        if (prev.includes(questionKey)) {
          return prev.filter(id => id !== questionKey);
        } else {
          return [...prev, questionKey];
        }
      });
    }
  };

  // 全選/取消全選
  const handleSelectAll = async () => {
    if (selectedQuestions.length > 0) {
      setSelectedQuestions([]);
    } else {
      const response = await axios.get(
        `/api/projects/${projectId}/questions?status=${answerFilter}&input=${searchTerm}&searchMatchMode=${searchMatchMode}&chunkName=${encodeURIComponent(chunkNameFilter)}&sourceType=${sourceTypeFilter}&selectedAll=1`
      );
      setSelectedQuestions(response.data.map(dataset => dataset.id));
    }
  };

  // 處理搜尋輸入變化
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
  };

  // 處理過濾器變化
  const handleFilterChange = event => {
    setAnswerFilter(event.target.value);
  };

  // 處理文字塊名稱篩選變化
  const handleChunkNameFilterChange = event => {
    setChunkNameFilter(event.target.value);
  };

  // 處理資料來源型別篩選變化
  const handleSourceTypeFilterChange = event => {
    setSourceTypeFilter(event.target.value);
  };

  // 處理搜尋匹配模式變化
  const handleSearchMatchModeChange = event => {
    setSearchMatchMode(event.target.value);
  };

  // 清空選擇
  const clearSelection = () => {
    setSelectedQuestions([]);
  };

  // 重置所有過濾條件
  const resetFilters = () => {
    setSearchTerm('');
    setSearchMatchMode('match');
    setAnswerFilter('all');
    setChunkNameFilter('');
    setSourceTypeFilter('all');
    setSelectedQuestions([]);
  };

  return {
    // 狀態
    answerFilter,
    searchTerm,
    debouncedSearchTerm,
    searchMatchMode,
    chunkNameFilter,
    debouncedChunkNameFilter,
    sourceTypeFilter,
    selectedQuestions,

    // 方法
    setAnswerFilter,
    setSearchTerm,
    setSearchMatchMode,
    setChunkNameFilter,
    setSourceTypeFilter,
    setSelectedQuestions,
    handleSelectQuestion,
    handleSelectAll,
    handleSearchChange,
    handleFilterChange,
    handleChunkNameFilterChange,
    handleSourceTypeFilterChange,
    handleSearchMatchModeChange,
    clearSelection,
    resetFilters
  };
}
