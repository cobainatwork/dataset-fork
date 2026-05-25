/**
 * 圖片資料集模組樣式配置
 * 參考圖片管理模組的精美設計
 */

export const imageDatasetStyles = {
  // 頁面容器
  pageContainer: {
    py: 4
  },

  // 頁面頭部
  header: {
    mb: 4,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 3
  },

  headerTitle: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0.5
  },

  title: {
    fontWeight: 700
  },

  subtitle: {
    color: 'text.secondary',
    fontSize: '0.875rem'
  },

  headerActions: {
    display: 'flex',
    gap: 2,
    flexWrap: 'wrap'
  },

  // 篩選區域
  filterCard: {
    mb: 3,
    borderRadius: 2,
    boxShadow: 1,
    border: '1px solid',
    borderColor: 'divider',
    overflow: 'visible'
  },

  filterContent: {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
    flexWrap: 'wrap'
  },

  // 資料集卡片 - 參考圖片管理的設計
  datasetCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 3,
    overflow: 'hidden',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    border: '1px solid',
    borderColor: 'divider',
    bgcolor: 'background.paper',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-8px)',
      boxShadow: theme => `0 12px 24px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
      borderColor: 'primary.main',
      '& .image-overlay': {
        opacity: 1
      },
      '& .image-media': {
        transform: 'scale(1.05)'
      }
    }
  },

  // 圖片包裝器
  imageWrapper: {
    position: 'relative',
    overflow: 'hidden',
    bgcolor: 'grey.100'
  },

  // 圖片媒體
  imageMedia: {
    className: 'image-media',
    height: 220,
    objectFit: 'cover',
    transition: 'transform 0.3s ease'
  },

  // 懸停遮罩
  imageOverlay: {
    className: 'image-overlay',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.6) 100%)',
    opacity: 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: 'none'
  },

  // 狀態標籤容器 - 右上角
  statusChipsContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    display: 'flex',
    gap: 0.5,
    flexDirection: 'column',
    alignItems: 'flex-end',
    zIndex: 2
  },

  // 狀態標籤
  statusChip: {
    backdropFilter: 'blur(10px)',
    fontWeight: 600,
    fontSize: '0.75rem',
    height: 24,
    boxShadow: 2
  },

  // 圖片名稱容器 - 底部
  imageNameContainer: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'center',
    zIndex: 2
  },

  // 圖片名稱標籤
  imageNameChip: {
    backdropFilter: 'blur(10px)',
    bgcolor: 'rgba(255, 255, 255, 0.95)',
    fontWeight: 600,
    maxWidth: '90%',
    boxShadow: 2,
    '& .MuiChip-label': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  },

  // 卡片內容
  cardContent: {
    flexGrow: 1,
    p: 2.5
  },

  // 問題文字
  questionText: {
    fontWeight: 600,
    fontSize: '0.95rem',
    lineHeight: 1.5,
    mb: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },

  // 答案預覽
  answerPreview: {
    color: 'text.secondary',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    mb: 2
  },

  // 元資料資訊
  metaInfo: {
    display: 'flex',
    gap: 1.5,
    flexWrap: 'wrap',
    mt: 2,
    pt: 2,
    borderTop: '1px solid',
    borderColor: 'divider'
  },

  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 0.5,
    fontSize: '0.75rem',
    color: 'text.secondary'
  },

  // 分頁樣式
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    mt: 4
  },

  // 操作按鈕容器
  actionButtonsContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 0.5,
    mt: 'auto'
  },

  // 操作按鈕樣式
  actionButton: {
    p: 0.5,
    borderRadius: 1,
    color: 'text.secondary',
    '&:hover': {
      backgroundColor: 'action.hover',
      color: 'primary.main'
    }
  },

  // 空狀態
  emptyState: {
    textAlign: 'center',
    py: 12,
    px: 3
  },

  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    bgcolor: 'primary.lighter',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    mx: 'auto',
    mb: 3
  },

  emptyTitle: {
    fontWeight: 600,
    mb: 1
  },

  emptyDescription: {
    color: 'text.secondary',
    mb: 4
  }
};
