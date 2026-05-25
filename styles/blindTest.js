import { alpha } from '@mui/material/styles';

export const blindTestStyles = theme => ({
  // 容器
  container: {
    p: 3,
    height: 'calc(100vh - 64px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    bgcolor: 'background.default'
  },

  // 頭部
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    mb: 2
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5
  },

  // 進度和問題區域
  questionPaper: {
    p: 3,
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
    bgcolor: theme.palette.background.paper
  },

  // 回答區域容器
  answersContainer: {
    display: 'flex',
    gap: 3,
    flex: 1,
    minHeight: 0, // 關鍵：允許 flex 子項收縮
    mt: 2
  },

  // 單個回答卡片
  answerPaper: {
    width: 'calc(50% - 12px)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
    overflow: 'hidden',
    bgcolor: theme.palette.background.paper
  },
  answerHeader: {
    p: 2,
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    bgcolor: theme.palette.background.default
  },
  answerContent: {
    flex: 1,
    overflow: 'auto',
    p: 3,
    // 增加捲軸美化
    '&::-webkit-scrollbar': {
      width: '8px'
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent'
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.divider,
      borderRadius: '4px'
    },
    '&::-webkit-scrollbar-thumb:hover': {
      backgroundColor: theme.palette.text.disabled
    }
  },
  answerFooter: {
    p: 1.5,
    borderTop: `1px solid ${theme.palette.divider}`,
    bgcolor: theme.palette.background.default,
    display: 'flex',
    justifyContent: 'flex-end'
  },

  // 底部投票欄
  voteBar: {
    p: 1.5,
    borderRadius: 4,
    mx: 'auto',
    width: 'fit-content',
    minWidth: 800,
    mt: 'auto',
    bgcolor: alpha(theme.palette.background.paper, 0.8),
    backdropFilter: 'blur(20px)',
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.shadows[8]
  },
  voteButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: 2
  },
  voteBtn: {
    flex: 1,
    py: 1.2,
    borderRadius: 3,
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: 'none',
    '&:hover': {
      boxShadow: theme.shadows[4]
    }
  },

  // 結果頁
  resultContainer: {
    height: 'calc(100vh - 64px)',
    overflow: 'auto',
    p: 3
  },
  resultContent: {
    maxWidth: 1200,
    mx: 'auto'
  },

  // 結果卡片
  scoreCard: {
    flex: 1,
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: theme.shadows[4]
    }
  },
  scoreCardContent: {
    textAlign: 'center',
    py: 5
  },

  // 詳細結果列表項
  resultItem: {
    mb: 2,
    borderRadius: 3,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: 'none',
    overflow: 'hidden',
    transition: 'all 0.2s ease'
  },
  resultItemHeader: {
    p: 2.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    '&:hover': {
      bgcolor: theme.palette.action.hover
    }
  }
});
