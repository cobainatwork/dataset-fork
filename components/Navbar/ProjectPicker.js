'use client';

import React, { useState } from 'react';
import { Box, Button, Menu, MenuItem, ListItemText, Typography, Divider } from '@mui/material';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import * as styles from './styles';

/**
 * ProjectPicker 元件
 * 在全域頁面（monitoring / duplicates / trust 等沒有當前專案的頁面）取代
 * NavigationTabs，提供「前往某個專案」的入口。選定專案後跳到該專案首頁。
 */
export default function ProjectPicker({ projects = [], onNavigateStart }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleSelect = projectId => {
    setAnchorEl(null);
    onNavigateStart?.();
    router.push(`/projects/${projectId}/text-split`);
  };

  return (
    <Box sx={styles.navContainerStyles}>
      <Button
        onClick={e => setAnchorEl(e.currentTarget)}
        startIcon={<FolderOpenOutlinedIcon />}
        endIcon={<ArrowDropDownIcon />}
        sx={{
          color: 'inherit',
          textTransform: 'none',
          fontWeight: 500,
          px: 2
        }}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {t('nav.goToProject', '前往專案')}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        transformOrigin={{ horizontal: 'center', vertical: 'top' }}
        PaperProps={{ sx: { maxHeight: 420, minWidth: 240 } }}
      >
        <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
          {t('nav.selectProjectHint', '選擇要進入的專案')}
        </Typography>
        <Divider />
        {projects.length === 0 ? (
          <MenuItem disabled>
            <ListItemText>{t('nav.noProjects', '尚無專案')}</ListItemText>
          </MenuItem>
        ) : (
          projects.map(p => (
            <MenuItem key={p.id} onClick={() => handleSelect(p.id)}>
              <ListItemText primary={p.name} secondary={p.description || undefined} />
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
}
