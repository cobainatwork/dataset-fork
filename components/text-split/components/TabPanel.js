'use client';

import { Box } from '@mui/material';

/**
 * 標籤頁面板元件
 * @param {Object} props
 * @param {number} props.value - 當前啟用的標籤索引
 * @param {number} props.index - 當前面板對應的索引
 * @param {ReactNode} props.children - 子元件
 */
export default function TabPanel({ value, index, children }) {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`domain-tabpanel-${index}`}
      aria-labelledby={`domain-tab-${index}`}
      sx={{ height: '100%' }}
    >
      {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
    </Box>
  );
}
