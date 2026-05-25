import React from 'react';
import { Tabs, Tab } from '@mui/material';

/**
 * 頂部分類選擇標籤頁元件
 */
const CategoryTabs = ({ categoryEntries, selectedCategory, currentLanguage, onCategoryChange }) => {
  return (
    <Tabs
      value={selectedCategory}
      onChange={(e, newValue) => {
        onCategoryChange(newValue);
      }}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
    >
      {categoryEntries.map(([categoryKey, categoryConfig]) => (
        <Tab key={categoryKey} label={categoryConfig.displayName[currentLanguage]} value={categoryKey} />
      ))}
    </Tabs>
  );
};

export default CategoryTabs;
