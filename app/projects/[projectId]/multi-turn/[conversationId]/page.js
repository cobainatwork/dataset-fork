'use client';

import {
  Container,
  Box,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper
} from '@mui/material';
import ConversationHeader from '@/components/conversations/ConversationHeader';
import ConversationMetadata from '@/components/conversations/ConversationMetadata';
import ConversationContent from '@/components/conversations/ConversationContent';
import ConversationRatingSection from '@/components/conversations/ConversationRatingSection';
import useConversationDetails from './useConversationDetails';
import { useTranslation } from 'react-i18next';

/**
 * 多輪對話詳情頁面
 */
export default function ConversationDetailPage({ params }) {
  const { projectId, conversationId } = params;
  const { t } = useTranslation();

  // 使用自定義Hook管理狀態和邏輯
  const {
    conversation,
    messages,
    loading,
    editMode,
    saving,
    editData,
    setEditData,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleEdit,
    handleSave,
    handleCancel,
    handleDelete,
    handleNavigate,
    updateMessageContent
  } = useConversationDetails(projectId, conversationId);

  // 載入狀態
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <Alert severity="info">{t('datasets.loadingDataset')}</Alert>
        </Box>
      </Container>
    );
  }

  // 無資料狀態
  if (!conversation) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{t('datasets.conversationNotFound')}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 頂部導航欄 */}
      <ConversationHeader
        projectId={projectId}
        conversationId={conversationId}
        conversation={conversation}
        editMode={editMode}
        saving={saving}
        onEdit={handleEdit}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={() => setDeleteDialogOpen(true)}
        onNavigate={handleNavigate}
      />

      {/* 主要佈局：左右分欄 */}
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* 左側主要內容區域 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{ p: 3 }}>
            {/* 對話內容 */}
            <ConversationContent
              messages={editMode ? editData.messages : messages}
              editMode={editMode}
              onMessageChange={updateMessageContent}
              conversation={conversation}
            />
          </Paper>
        </Box>

        {/* 右側固定側邊欄 */}
        <Box
          sx={{
            width: 360,
            position: 'sticky',
            top: 24,
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto'
          }}
        >
          {/* 元資料展示 */}
          <ConversationMetadata conversation={conversation} />

          {/* 評分、標籤、備註區域 */}
          <ConversationRatingSection
            conversation={conversation}
            projectId={projectId}
            onUpdate={() => {
              // 更新成功後重新整理資料，保持頁面狀態同步
              // 這裡可以呼叫 useConversationDetails 的重新整理邏輯
            }}
          />
        </Box>
      </Box>

      {/* 刪除確認對話方塊 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('datasets.confirmDelete')}</DialogTitle>
        <DialogContent>
          <Typography>{t('datasets.confirmDeleteConversation')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button color="error" onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
