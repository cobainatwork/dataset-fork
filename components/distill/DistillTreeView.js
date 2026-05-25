'use client';

import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, List } from '@mui/material';
import axios from 'axios';
import { useAtomValue } from 'jotai';
import { selectedModelInfoAtom } from '@/lib/store';
import { useGenerateDataset } from '@/hooks/useGenerateDataset';
import { toast } from 'sonner';

// 匯入子元件
import TagTreeItem from './TagTreeItem';
import TagMenu from './TagMenu';
import TagEditDialog from './TagEditDialog';
import ConfirmDialog from './ConfirmDialog';
import { sortTagsByNumber } from './utils';

/**
 * 蒸餾樹形檢視元件
 * @param {Object} props
 * @param {string} props.projectId - 專案ID
 * @param {Array} props.tags - 標籤列表
 * @param {Array} props.initialQuestions - 父元件預載入的問題列表（可選），有則跳過自行請求
 * @param {Function} props.onGenerateSubTags - 生成子標籤的回撥函式
 * @param {Function} props.onGenerateQuestions - 生成問題的回撥函式
 * @param {Function} props.onTagsUpdate - 標籤更新的回撥函式
 */
const DistillTreeView = forwardRef(function DistillTreeView(
  { projectId, tags = [], initialQuestions, onGenerateSubTags, onGenerateQuestions, onTagsUpdate },
  ref
) {
  const { t } = useTranslation();
  const selectedModel = useAtomValue(selectedModelInfoAtom);
  const [expandedTags, setExpandedTags] = useState({});
  const [tagQuestions, setTagQuestions] = useState({});
  const [loadingTags, setLoadingTags] = useState({});
  const [loadingQuestions, setLoadingQuestions] = useState({});
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedTagForMenu, setSelectedTagForMenu] = useState(null);
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingQuestions, setProcessingQuestions] = useState({});
  const [processingMultiTurnQuestions, setProcessingMultiTurnQuestions] = useState({});
  const [deleteQuestionConfirmOpen, setDeleteQuestionConfirmOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tagToEdit, setTagToEdit] = useState(null);
  const [project, setProject] = useState(null);
  const [projectName, setProjectName] = useState('');

  // 使用生成資料集的hook
  const { generateSingleDataset } = useGenerateDataset();

  // 獲取問題統計資訊
  const fetchQuestionsStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/questions/tree?isDistill=true`);
      setAllQuestions(response.data);
    } catch (error) {
      console.error('獲取問題統計資訊失敗:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 暴露方法給父元件
  useImperativeHandle(ref, () => ({
    fetchQuestionsStats
  }));

  // 若父元件已預載入問題資料，直接使用，避免重複請求
  useEffect(() => {
    if (initialQuestions) {
      setAllQuestions(initialQuestions);
    }
  }, [initialQuestions]);

  // 獲取標籤下的問題
  const fetchQuestionsByTag = useCallback(
    async tagId => {
      try {
        setLoadingQuestions(prev => ({ ...prev, [tagId]: true }));
        const response = await axios.get(`/api/projects/${projectId}/distill/questions/by-tag?tagId=${tagId}`);
        setTagQuestions(prev => ({
          ...prev,
          [tagId]: response.data
        }));
      } catch (error) {
        console.error('獲取標籤問題失敗:', error);
      } finally {
        setLoadingQuestions(prev => ({ ...prev, [tagId]: false }));
      }
    },
    [projectId]
  );

  // 獲取專案資訊，獲取專案名稱
  useEffect(() => {
    if (projectId) {
      axios
        .get(`/api/projects/${projectId}`)
        .then(response => {
          setProject(response.data);
          setProjectName(response.data.name || '');
        })
        .catch(error => {
          console.error('獲取專案資訊失敗:', error);
        });
    }
  }, [projectId]);

  // 初始化時獲取問題統計資訊（若父元件已傳入則跳過）
  useEffect(() => {
    if (!initialQuestions) {
      fetchQuestionsStats();
    }
  }, [fetchQuestionsStats, initialQuestions]);

  // 構建標籤樹
  const tagTree = useMemo(() => {
    const rootTags = [];
    const tagMap = {};

    // 建立標籤對映
    tags.forEach(tag => {
      tagMap[tag.id] = { ...tag, children: [] };
    });

    // 構建樹結構
    tags.forEach(tag => {
      if (tag.parentId && tagMap[tag.parentId]) {
        tagMap[tag.parentId].children.push(tagMap[tag.id]);
      } else {
        rootTags.push(tagMap[tag.id]);
      }
    });

    return rootTags;
  }, [tags]);

  // 預建 label -> 問題數量 的 Map，供 TagTreeItem 做 O(1) 查詢，避免每次渲染遍歷全量問題陣列
  const labelCountMap = useMemo(() => {
    const map = {};
    allQuestions.forEach(q => {
      if (q.label) {
        map[q.label] = (map[q.label] || 0) + 1;
      }
    });
    return map;
  }, [allQuestions]);

  // 切換標籤展開/摺疊狀態
  const toggleTag = useCallback(
    tagId => {
      setExpandedTags(prev => ({
        ...prev,
        [tagId]: !prev[tagId]
      }));

      // 如果展開且還沒有載入過問題，則載入問題
      if (!expandedTags[tagId] && !tagQuestions[tagId]) {
        fetchQuestionsByTag(tagId);
      }
    },
    [expandedTags, tagQuestions, fetchQuestionsByTag]
  );

  // 處理選單開啟
  const handleMenuOpen = (event, tag) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedTagForMenu(tag);
  };

  // 處理選單關閉
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedTagForMenu(null);
  };

  // 開啟編輯標籤對話方塊
  const openEditDialog = () => {
    setTagToEdit(selectedTagForMenu);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  // 關閉編輯標籤對話方塊
  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setTagToEdit(null);
  };

  // 處理編輯標籤成功
  const handleEditTagSuccess = updatedTag => {
    // 更新標籤資料，不重新整理頁面
    const updateTagInTree = tagList => {
      return tagList.map(tag => {
        if (tag.id === updatedTag.id) {
          return { ...tag, label: updatedTag.label };
        }
        if (tag.children && tag.children.length > 0) {
          return { ...tag, children: updateTagInTree(tag.children) };
        }
        return tag;
      });
    };

    // 呼叫父元件的回撥更新標籤列表
    const updatedTags = updateTagInTree(tags);
    onTagsUpdate?.(updatedTags);
  };

  // 開啟刪除確認對話方塊
  const openDeleteConfirm = () => {
    console.log('開啟刪除確認對話方塊', selectedTagForMenu);
    // 儲存要刪除的標籤
    setTagToDelete(selectedTagForMenu);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  // 關閉刪除確認對話方塊
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
  };

  // 處理刪除標籤
  const handleDeleteTag = () => {
    if (!tagToDelete) {
      console.log('沒有要刪除的標籤資訊');
      return;
    }

    console.log('開始刪除標籤:', tagToDelete.id, tagToDelete.label);

    // 先關閉確認對話方塊
    closeDeleteConfirm();

    // 執行刪除操作
    const deleteTagAction = async () => {
      try {
        console.log('傳送刪除請求:', `/api/projects/${projectId}/tags?id=${tagToDelete.id}`);

        // 傳送刪除請求
        const response = await axios.delete(`/api/projects/${projectId}/tags?id=${tagToDelete.id}`);

        console.log('刪除標籤成功:', response.data);

        // 重新整理頁面
        window.location.reload();
      } catch (error) {
        console.error('刪除標籤失敗:', error);
        console.error('錯誤詳情:', error.response ? error.response.data : '無響應資料');
        alert(`刪除標籤失敗: ${error.message}`);
      }
    };

    // 立即執行刪除操作
    deleteTagAction();
  };

  // 開啟刪除問題確認對話方塊
  const openDeleteQuestionConfirm = (questionId, event) => {
    event.stopPropagation();
    setQuestionToDelete(questionId);
    setDeleteQuestionConfirmOpen(true);
  };

  // 關閉刪除問題確認對話方塊
  const closeDeleteQuestionConfirm = () => {
    setDeleteQuestionConfirmOpen(false);
    setQuestionToDelete(null);
  };

  // 處理刪除問題
  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      await axios.delete(`/api/projects/${projectId}/questions/${questionToDelete}`);
      // 更新問題列表
      setTagQuestions(prev => {
        const newQuestions = { ...prev };
        Object.keys(newQuestions).forEach(tagId => {
          newQuestions[tagId] = newQuestions[tagId].filter(q => q.id !== questionToDelete);
        });
        return newQuestions;
      });
      // 關閉確認對話方塊
      closeDeleteQuestionConfirm();
    } catch (error) {
      console.error('刪除問題失敗:', error);
    }
  };

  // 處理生成資料集
  const handleGenerateDataset = async (questionId, questionInfo, event) => {
    event.stopPropagation();
    // 設定處理狀態
    setProcessingQuestions(prev => ({
      ...prev,
      [questionId]: true
    }));
    await generateSingleDataset({ projectId, questionId, questionInfo });
    // 重置處理狀態
    setProcessingQuestions(prev => ({
      ...prev,
      [questionId]: false
    }));
  };

  // 處理生成多輪對話資料集
  const handleGenerateMultiTurnDataset = async (questionId, questionInfo, event) => {
    event.stopPropagation();

    try {
      // 設定處理狀態
      setProcessingMultiTurnQuestions(prev => ({
        ...prev,
        [questionId]: true
      }));

      // 首先檢查專案是否配置了多輪對話設定
      const configResponse = await axios.get(`/api/projects/${projectId}/tasks`);
      if (configResponse.status !== 200) {
        throw new Error('獲取專案配置失敗');
      }

      const config = configResponse.data;
      const multiTurnConfig = {
        systemPrompt: config.multiTurnSystemPrompt,
        scenario: config.multiTurnScenario,
        rounds: config.multiTurnRounds,
        roleA: config.multiTurnRoleA,
        roleB: config.multiTurnRoleB
      };

      // 檢查是否已配置必要的多輪對話設定
      if (
        !multiTurnConfig.scenario ||
        !multiTurnConfig.roleA ||
        !multiTurnConfig.roleB ||
        !multiTurnConfig.rounds ||
        multiTurnConfig.rounds < 1
      ) {
        throw new Error('請先在專案設定中配置多輪對話相關引數');
      }

      // 檢查是否選擇了模型
      if (!selectedModel || Object.keys(selectedModel).length === 0) {
        throw new Error('請先選擇一個模型');
      }

      // 呼叫多輪對話生成API
      const response = await axios.post(`/api/projects/${projectId}/dataset-conversations`, {
        questionId,
        ...multiTurnConfig,
        model: selectedModel,
        language: 'zh-CN'
      });

      if (response.status === 200) {
        // 成功後重新整理問題統計
        fetchQuestionsStats();
        toast.success(t('datasets.multiTurnGenerateSuccess', { defaultValue: '多輪對話資料集生成成功！' }));

        // 通知父元件重新整理統計資訊
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('refreshDistillStats'));
        }
      }
    } catch (error) {
      console.error('生成多輪對話資料集失敗:', error);
      toast.error(error.message || t('datasets.multiTurnGenerateError', { defaultValue: '生成多輪對話資料集失敗' }));
    } finally {
      // 重置處理狀態
      setProcessingMultiTurnQuestions(prev => ({
        ...prev,
        [questionId]: false
      }));
    }
  };

  // 獲取標籤路徑
  const getTagPath = useCallback(
    tag => {
      if (!tag) return '';

      const findPath = (currentTag, path = []) => {
        const newPath = [currentTag.label, ...path];

        if (!currentTag.parentId) {
          // 如果是頂級標籤，確保路徑以專案名稱開始
          if (projectName && !newPath.includes(projectName)) {
            return [projectName, ...newPath];
          }
          return newPath;
        }

        const parentTag = tags.find(t => t.id === currentTag.parentId);
        if (!parentTag) {
          // 如果沒有找到父標籤，確保路徑以專案名稱開始
          if (projectName && !newPath.includes(projectName)) {
            return [projectName, ...newPath];
          }
          return newPath;
        }

        return findPath(parentTag, newPath);
      };

      const path = findPath(tag);

      // 最終檢查，確保路徑以專案名稱開始
      if (projectName && path.length > 0 && path[0] !== projectName) {
        path.unshift(projectName);
      }

      return path.join(' > ');
    },
    [tags, projectName]
  );

  // 渲染標籤樹
  const renderTagTree = (tagList, level = 0) => {
    // 對同級標籤進行排序
    const sortedTagList = sortTagsByNumber(tagList);

    return (
      <List disablePadding sx={{ px: 2 }}>
        {sortedTagList.map(tag => (
          <TagTreeItem
            key={tag.id}
            tag={tag}
            level={level}
            expanded={expandedTags[tag.id]}
            onToggle={toggleTag}
            onMenuOpen={handleMenuOpen}
            onGenerateQuestions={tag => {
              // 包裝函式，處理問題生成後的重新整理
              const handleGenerateQuestionsWithRefresh = async () => {
                // 呼叫父元件傳入的函式生成問題
                await onGenerateQuestions(tag, getTagPath(tag));

                // 生成問題後重新整理資料
                await fetchQuestionsStats();

                // 如果標籤已展開，重新整理該標籤的問題詳情
                if (expandedTags[tag.id]) {
                  await fetchQuestionsByTag(tag.id);
                }
              };

              handleGenerateQuestionsWithRefresh();
            }}
            onGenerateSubTags={tag => onGenerateSubTags(tag, getTagPath(tag))}
            questions={tagQuestions[tag.id] || []}
            loadingQuestions={loadingQuestions[tag.id]}
            processingQuestions={processingQuestions}
            processingMultiTurnQuestions={processingMultiTurnQuestions}
            onDeleteQuestion={openDeleteQuestionConfirm}
            onGenerateDataset={handleGenerateDataset}
            onGenerateMultiTurnDataset={handleGenerateMultiTurnDataset}
            labelCountMap={labelCountMap}
            tagQuestions={tagQuestions}
          >
            {/* 遞迴渲染子標籤 */}
            {tag.children && tag.children.length > 0 && expandedTags[tag.id] && renderTagTree(tag.children, level + 1)}
          </TagTreeItem>
        ))}
      </List>
    );
  };

  return (
    <Box>
      {tagTree.length > 0 ? (
        renderTagTree(tagTree)
      ) : (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            {t('distill.noTags')}
          </Typography>
        </Box>
      )}

      {/* 標籤操作選單 */}
      <TagMenu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        onEdit={openEditDialog}
        onDelete={openDeleteConfirm}
      />

      {/* 編輯標籤對話方塊 */}
      <TagEditDialog
        open={editDialogOpen}
        tag={tagToEdit}
        projectId={projectId}
        onClose={closeEditDialog}
        onSuccess={handleEditTagSuccess}
      />

      {/* 刪除標籤確認對話方塊 */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleDeleteTag}
        title={t('distill.deleteTagConfirmTitle')}
        cancelText={t('common.cancel')}
        confirmText={t('common.delete')}
        confirmColor="error"
      />

      {/* 刪除問題確認對話方塊 */}
      <ConfirmDialog
        open={deleteQuestionConfirmOpen}
        onClose={closeDeleteQuestionConfirm}
        onConfirm={handleDeleteQuestion}
        title={t('questions.deleteConfirm')}
        cancelText={t('common.cancel')}
        confirmText={t('common.delete')}
        confirmColor="error"
      />
    </Box>
  );
});

export default DistillTreeView;
