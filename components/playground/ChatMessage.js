import React, { useState } from 'react';
import { Box, Paper, Typography, Alert, useTheme, IconButton, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useTranslation } from 'react-i18next';

/**
 * 聊天訊息元件
 * @param {Object} props
 * @param {Object} props.message - 訊息物件
 * @param {string} props.message.role - 訊息角色：'user'、'assistant' 或 'error'
 * @param {string} props.message.content - 訊息內容
 * @param {string} props.modelName - 模型名稱（僅在 assistant 或 error 型別訊息中顯示）
 */
export default function ChatMessage({ message, modelName }) {
  const theme = useTheme();
  const { t } = useTranslation();

  // 使用者訊息
  if (message.role === 'user') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 2
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            borderRadius: '16px 16px 0 16px',
            maxWidth: '80%',
            bgcolor: theme.palette.primary.main,
            color: 'white'
          }}
        >
          {typeof message.content === 'string' ? (
            <Typography variant="body1">{message.content}</Typography>
          ) : (
            // 如果是陣列型別（用於視覺模型的使用者輸入）
            <>
              {Array.isArray(message.content) &&
                message.content.map((item, i) => {
                  if (item.type === 'text') {
                    return (
                      <Typography key={i} variant="body1">
                        {item.text}
                      </Typography>
                    );
                  } else if (item.type === 'image_url') {
                    return (
                      <Box key={i} sx={{ mt: 1, mb: 1 }}>
                        <img
                          src={item.image_url.url}
                          alt="上傳圖片"
                          style={{ maxWidth: '100%', borderRadius: '4px' }}
                        />
                      </Box>
                    );
                  }
                  return null;
                })}
            </>
          )}
        </Paper>
      </Box>
    );
  }

  // 助手訊息
  if (message.role === 'assistant') {
    // 處理推理過程的展示狀態
    const [showThinking, setShowThinking] = useState(message.showThinking || false);
    const hasThinking = message.thinking && message.thinking.trim().length > 0;

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            borderRadius: '16px 16px 16px 0',
            maxWidth: '80%',
            width: hasThinking ? '80%' : 'auto',
            bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100]
          }}
        >
          {modelName && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
              {modelName}
            </Typography>
          )}

          {/* 推理過程顯示區域 */}
          {hasThinking && (
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {message.isStreaming ? (
                    <AutoFixHighIcon
                      fontSize="small"
                      color="primary"
                      sx={{
                        animation: 'thinking-pulse 1.5s infinite',
                        '@keyframes thinking-pulse': {
                          '0%': { opacity: 0.4 },
                          '50%': { opacity: 1 },
                          '100%': { opacity: 0.4 }
                        }
                      }}
                    />
                  ) : (
                    <PsychologyIcon fontSize="small" color="primary" />
                  )}
                  <Typography variant="caption" color="primary" fontWeight="bold">
                    {t('playground.reasoningProcess', '推理過程')}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setShowThinking(!showThinking)} sx={{ p: 0 }}>
                  {showThinking ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              </Box>

              <Collapse in={showThinking}>
                <Box
                  sx={{
                    p: 1,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.85rem'
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: theme.palette.text.secondary }}>
                    {message.thinking}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          )}

          {/* 回答內容 */}
          <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
            {typeof message.content === 'string' ? (
              <>
                {message.content}
                {message.isStreaming && <span className="blinking-cursor">|</span>}
              </>
            ) : (
              // 如果是陣列型別（用於視覺模型的響應）
              <>
                {Array.isArray(message.content) &&
                  message.content.map((item, i) => {
                    if (item.type === 'text') {
                      return <span key={i}>{item.text}</span>;
                    } else if (item.type === 'image_url') {
                      return (
                        <Box key={i} sx={{ mt: 1, mb: 1 }}>
                          <img src={item.image_url.url} alt="圖片" style={{ maxWidth: '100%', borderRadius: '4px' }} />
                        </Box>
                      );
                    }
                    return null;
                  })}
                {message.isStreaming && <span className="blinking-cursor">|</span>}
              </>
            )}
          </Typography>
        </Paper>
      </Box>
    );
  }

  // 錯誤訊息
  if (message.role === 'error') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 2
        }}
      >
        <Alert severity="error" sx={{ maxWidth: '80%' }}>
          {modelName && (
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              {modelName}
            </Typography>
          )}
          {message.content}
        </Alert>
      </Box>
    );
  }

  return null;
}
