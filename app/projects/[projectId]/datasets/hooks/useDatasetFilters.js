'use client';

import { useState, useEffect } from 'react';

/**
 * 資料集篩選條件持久化 Hook
 * 負責篩選條件的儲存、恢復和管理
 * @param {string} projectId - 專案ID
 * @returns {Object} 篩選條件和相關方法
 */
export function useDatasetFilters(projectId) {
  const [filterConfirmed, setFilterConfirmed] = useState('all');
  const [filterHasCot, setFilterHasCot] = useState('all');
  const [filterIsDistill, setFilterIsDistill] = useState('all');
  const [filterScoreRange, setFilterScoreRange] = useState([0, 5]);
  const [filterCustomTag, setFilterCustomTag] = useState('');
  const [filterNoteKeyword, setFilterNoteKeyword] = useState('');
  const [filterChunkName, setFilterChunkName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState('question');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isInitialized, setIsInitialized] = useState(false);

  // 從 localStorage 恢復篩選條件
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedFilters = localStorage.getItem(`datasets-filters-${projectId}`);
        if (savedFilters) {
          const filters = JSON.parse(savedFilters);
          setFilterConfirmed(filters.filterConfirmed || 'all');
          setFilterHasCot(filters.filterHasCot || 'all');
          setFilterIsDistill(filters.filterIsDistill || 'all');
          setFilterScoreRange(filters.filterScoreRange || [0, 5]);
          setFilterCustomTag(filters.filterCustomTag || '');
          setFilterNoteKeyword(filters.filterNoteKeyword || '');
          setFilterChunkName(filters.filterChunkName || '');
          setSearchQuery(filters.searchQuery || '');
          setSearchField(filters.searchField || 'question');
          setPage(filters.page || 1);
          setRowsPerPage(filters.rowsPerPage || 10);
        }
      } catch (error) {
        console.error('恢復篩選條件失敗:', error);
      }
      setIsInitialized(true);
    }
  }, [projectId]);

  // 儲存篩選條件到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && isInitialized) {
      try {
        const filters = {
          filterConfirmed,
          filterHasCot,
          filterIsDistill,
          filterScoreRange,
          filterCustomTag,
          filterNoteKeyword,
          filterChunkName,
          searchQuery,
          searchField,
          page,
          rowsPerPage
        };
        localStorage.setItem(`datasets-filters-${projectId}`, JSON.stringify(filters));
      } catch (error) {
        console.error('儲存篩選條件失敗:', error);
      }
    }
  }, [
    projectId,
    filterConfirmed,
    filterHasCot,
    filterIsDistill,
    filterScoreRange,
    filterCustomTag,
    filterNoteKeyword,
    filterChunkName,
    searchQuery,
    searchField,
    page,
    rowsPerPage,
    isInitialized
  ]);

  /**
   * 重置所有篩選條件為預設值
   */
  const resetFilters = () => {
    setFilterConfirmed('all');
    setFilterHasCot('all');
    setFilterIsDistill('all');
    setFilterScoreRange([0, 5]);
    setFilterCustomTag('');
    setFilterNoteKeyword('');
    setFilterChunkName('');
    setSearchQuery('');
    setSearchField('question');
    setPage(1);
    setRowsPerPage(10);
  };

  /**
   * 清除 localStorage 中的篩選條件
   */
  const clearSavedFilters = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`datasets-filters-${projectId}`);
      } catch (error) {
        console.error('清除篩選條件失敗:', error);
      }
    }
  };

  /**
   * 計算當前活躍的篩選條件數量
   * @returns {number} 活躍篩選條件的數量
   */
  const getActiveFilterCount = () => {
    let count = 0;

    if (filterConfirmed !== 'all') count++;
    if (filterHasCot !== 'all') count++;
    if (filterIsDistill !== 'all') count++;
    if (filterScoreRange[0] > 0 || filterScoreRange[1] < 5) count++;
    if (filterCustomTag) count++;
    if (filterNoteKeyword) count++;
    if (filterChunkName) count++;

    return count;
  };

  return {
    // 篩選條件狀態
    filterConfirmed,
    setFilterConfirmed,
    filterHasCot,
    setFilterHasCot,
    filterIsDistill,
    setFilterIsDistill,
    filterScoreRange,
    setFilterScoreRange,
    filterCustomTag,
    setFilterCustomTag,
    filterNoteKeyword,
    setFilterNoteKeyword,
    filterChunkName,
    setFilterChunkName,
    searchQuery,
    setSearchQuery,
    searchField,
    setSearchField,
    // 分頁狀態
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    // 初始化狀態
    isInitialized,
    // 工具方法
    resetFilters,
    clearSavedFilters,
    getActiveFilterCount
  };
}

export default useDatasetFilters;
