'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
  Chip,
  Tooltip,
  List,
  CircularProgress
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AddIcon from '@mui/icons-material/Add';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTranslation } from 'react-i18next';
import QuestionListItem from './QuestionListItem';

/**
 * 標籤樹項元件
 * @param {Object} props
 * @param {Object} props.tag - 標籤物件
 * @param {number} props.level - 縮排級別
 * @param {boolean} props.expanded - 是否展開
 * @param {Function} props.onToggle - 切換展開/摺疊的回撥
 * @param {Function} props.onMenuOpen - 開啟選單的回撥
 * @param {Function} props.onGenerateQuestions - 生成問題的回撥
 * @param {Function} props.onGenerateSubTags - 生成子標籤的回撥
 * @param {Array} props.questions - 標籤下的問題列表
 * @param {boolean} props.loadingQuestions - 是否正在載入問題
 * @param {Object} props.processingQuestions - 正在處理的問題ID對映
 * @param {Function} props.onDeleteQuestion - 刪除問題的回撥
 * @param {Function} props.onGenerateDataset - 生成資料集的回撥
 * @param {Function} props.onGenerateMultiTurnDataset - 生成多輪對話資料集的回撥
 * @param {Object} props.processingMultiTurnQuestions - 正在生成多輪對話的問題ID對映
 * @param {Object} props.labelCountMap - label -> 問題數量的對映（由 DistillTreeView 預建，O(1) 查詢）
 * @param {Object} props.tagQuestions - 標籤問題對映
 * @param {React.ReactNode} props.children - 子標籤內容
 */
export default function TagTreeItem({
  tag,
  level = 0,
  expanded = false,
  onToggle,
  onMenuOpen,
  onGenerateQuestions,
  onGenerateSubTags,
  questions = [],
  loadingQuestions = false,
  processingQuestions = {},
  onDeleteQuestion,
  onGenerateDataset,
  onGenerateMultiTurnDataset,
  processingMultiTurnQuestions = {},
  labelCountMap = {},
  tagQuestions = {},
  children
}) {
  const { t } = useTranslation();

  // 遞迴計算所有層級的子標籤數量
  const getTotalSubTagsCount = childrenTags => {
    let count = childrenTags.length;
    childrenTags.forEach(childTag => {
      if (childTag.children && childTag.children.length > 0) {
        count += getTotalSubTagsCount(childTag.children);
      }
    });
    return count;
  };

  // 遞迴獲取所有子標籤的問題數量（使用 labelCountMap，O(1) 查詢）
  const getChildrenQuestionsCount = childrenTags => {
    let count = 0;
    childrenTags.forEach(childTag => {
      if (tagQuestions[childTag.id] && tagQuestions[childTag.id].length > 0) {
        count += tagQuestions[childTag.id].length;
      } else {
        count += labelCountMap[childTag.label] || 0;
      }
      if (childTag.children && childTag.children.length > 0) {
        count += getChildrenQuestionsCount(childTag.children);
      }
    });
    return count;
  };

  // 計算當前標籤的問題數量（使用 labelCountMap，O(1) 查詢）
  const getCurrentTagQuestionsCount = () => {
    if (tagQuestions[tag.id] && tagQuestions[tag.id].length > 0) {
      return tagQuestions[tag.id].length;
    }
    return labelCountMap[tag.label] || 0;
  };

  // 總問題數量 = 當前標籤的問題 + 所有子標籤的問題
  const totalQuestions =
    getCurrentTagQuestionsCount() + (tag.children ? getChildrenQuestionsCount(tag.children || []) : 0);

  return (
    <Box key={tag.id} sx={{ my: 0.5 }}>
      <ListItem
        disablePadding
        sx={{
          pl: level * 2,
          borderLeft: level > 0 ? '1px dashed rgba(0, 0, 0, 0.1)' : 'none',
          ml: level > 0 ? 2 : 0
        }}
      >
        <ListItemButton onClick={() => onToggle(tag.id)} sx={{ borderRadius: 1, py: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <FolderIcon color="primary" fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ fontWeight: 'medium' }}>{tag.label}</Typography>
                {tag.children && tag.children.length > 0 && (
                  <Chip
                    size="small"
                    label={`${getTotalSubTagsCount(tag.children)} ${t('distill.subTags')}`}
                    color="primary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
                {totalQuestions > 0 && (
                  <Chip
                    size="small"
                    label={`${totalQuestions} ${t('distill.questions')}`}
                    color="secondary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
            }
            primaryTypographyProps={{ component: 'div' }}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Tooltip title={t('distill.generateQuestions')}>
              <IconButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  onGenerateQuestions(tag);
                }}
              >
                <QuestionMarkIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <Tooltip title={t('distill.addChildTag')}>
              <IconButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  onGenerateSubTags(tag);
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            <IconButton size="small" onClick={e => onMenuOpen(e, tag)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>

            {tag.children && tag.children.length > 0 ? (
              expanded ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )
            ) : null}
          </Box>
        </ListItemButton>
      </ListItem>

      {/* 子標籤 */}
      {tag.children && tag.children.length > 0 && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          {children}
        </Collapse>
      )}

      {/* 標籤下的問題 */}
      {expanded && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List disablePadding sx={{ mt: 0.5, mb: 1 }}>
            {loadingQuestions ? (
              <ListItem sx={{ pl: (level + 1) * 2, py: 0.75 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  {t('common.loading')}
                </Typography>
              </ListItem>
            ) : questions && questions.length > 0 ? (
              questions.map(question => (
                <QuestionListItem
                  key={question.id}
                  question={question}
                  level={level}
                  processing={processingQuestions[question.id]}
                  processingMultiTurn={processingMultiTurnQuestions[question.id]}
                  onDelete={e => onDeleteQuestion(question.id, e)}
                  onGenerateDataset={e => onGenerateDataset(question.id, question.question, e)}
                  onGenerateMultiTurnDataset={
                    onGenerateMultiTurnDataset ? e => onGenerateMultiTurnDataset(question.id, question, e) : undefined
                  }
                />
              ))
            ) : (
              <ListItem sx={{ pl: (level + 1) * 2, py: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('distill.noQuestions')}
                </Typography>
              </ListItem>
            )}
          </List>
        </Collapse>
      )}
    </Box>
  );
}
