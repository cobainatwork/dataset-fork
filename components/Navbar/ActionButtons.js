'use client';

import React, { useState } from 'react';
import { Box, IconButton, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import BarChartIcon from '@mui/icons-material/BarChart';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import LanguageSwitcher from '../LanguageSwitcher';
import UpdateChecker from '../UpdateChecker';
import TaskIcon from '../TaskIcon';
import ModelSelect from '../ModelSelect';
import * as styles from './styles';

/**
 * ActionButtons 元件
 * 右側操作區：系統工具選單、語言切換、主題切換、更新檢查
 */
export default function ActionButtons({
  theme,
  resolvedTheme,
  toggleTheme,
  isProjectDetail,
  currentProject,
  onActionAreaEnter
}) {
  const { t } = useTranslation();
  const [toolsAnchor, setToolsAnchor] = useState(null);
  const toolsOpen = Boolean(toolsAnchor);

  const systemTools = [
    {
      key: 'monitoring',
      href: '/monitoring',
      icon: <BarChartIcon fontSize="small" />,
      label: t('systemTools.monitoring', '資源監控')
    },
    {
      key: 'duplicates',
      href: '/duplicates',
      icon: <ContentCopyOutlinedIcon fontSize="small" />,
      label: t('systemTools.duplicates', '重複問題')
    },
    {
      key: 'trust',
      href: '/trust',
      icon: <VerifiedOutlinedIcon fontSize="small" />,
      label: t('systemTools.trust', '去重信心度')
    }
  ];

  return (
    <Box sx={styles.actionAreaStyles} onMouseEnter={onActionAreaEnter}>
      {isProjectDetail && <ModelSelect projectId={currentProject} />}
      {isProjectDetail && <TaskIcon theme={theme} projectId={currentProject} />}

      {/* 系統工具下拉選單 - 常駐（首頁與專案頁都顯示） */}
      <Tooltip title={t('systemTools.title', '系統工具')}>
        <IconButton
          onClick={e => setToolsAnchor(e.currentTarget)}
          size="medium"
          aria-label={t('systemTools.title', '系統工具')}
          aria-haspopup="true"
          aria-expanded={toolsOpen}
          sx={styles.getIconButtonStyles(theme)}
        >
          <AppsOutlinedIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={toolsAnchor}
        open={toolsOpen}
        onClose={() => setToolsAnchor(null)}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      >
        {systemTools.map(tool => (
          <MenuItem key={tool.key} component="a" href={tool.href} onClick={() => setToolsAnchor(null)}>
            <ListItemIcon>{tool.icon}</ListItemIcon>
            <ListItemText>{tool.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>

      {/* 語言切換 - 常駐 */}
      <LanguageSwitcher />

      {/* 主題切換 - 常駐 */}
      <Tooltip
        title={
          resolvedTheme === 'dark'
            ? t('theme.switchToLight', 'Switch to light mode')
            : t('theme.switchToDark', 'Switch to dark mode')
        }
      >
        <IconButton
          onClick={toggleTheme}
          size="medium"
          aria-label={
            resolvedTheme === 'dark'
              ? t('theme.switchToLight', 'Switch to light mode')
              : t('theme.switchToDark', 'Switch to dark mode')
          }
          sx={styles.getIconButtonStyles(theme)}
        >
          {resolvedTheme === 'dark' ? (
            <LightModeOutlinedIcon fontSize="small" />
          ) : (
            <DarkModeOutlinedIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      {/* 更新檢查 - 大螢幕才顯示 */}
      <Box sx={{ display: { xs: 'none', xl: 'flex' } }}>
        <UpdateChecker />
      </Box>
    </Box>
  );
}
