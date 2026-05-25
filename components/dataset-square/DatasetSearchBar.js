'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
  ClickAwayListener,
  Fade,
  Avatar,
  useTheme,
  alpha
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LaunchIcon from '@mui/icons-material/Launch';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import sites from '@/constant/sites.json';
import { useTranslation } from 'react-i18next';
import { getSiteField } from '@/lib/util/sites-i18n';

export function DatasetSearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  // 從 localStorage 載入最近搜尋
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentDatasetSearches');
    if (savedSearches) {
      try {
        const searches = JSON.parse(savedSearches);
        setRecentSearches(searches);
      } catch (e) {
        console.error('解析最近搜尋失敗', e);
      }
    }
  }, []);

  // 處理搜尋輸入變化
  const handleSearchChange = event => {
    setSearchQuery(event.target.value);
    if (event.target.value) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // 處理回車搜尋
  const handleSearchSubmit = event => {
    if (event.key === 'Enter' && searchQuery.trim()) {
      // 預設使用第一個搜尋引擎
      if (sites.length > 0) {
        handleSuggestionClick(sites[0]);
      }
    }
  };

  // 儲存最近搜尋
  const saveRecentSearch = query => {
    if (!query.trim()) return;

    // 新增到最近搜尋並去重
    const updatedSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updatedSearches);

    // 儲存到 localStorage
    try {
      localStorage.setItem('recentDatasetSearches', JSON.stringify(updatedSearches));
    } catch (e) {
      console.error('儲存最近搜尋失敗', e);
    }
  };

  // 處理點選搜尋建議
  const handleSuggestionClick = site => {
    if (searchQuery.trim()) {
      // 根據不同網站處理搜尋引數
      let searchUrl = site.link;

      // 如果連結中不包含問號，則新增搜尋引數
      if (site.link.includes('huggingface.co')) {
        searchUrl = `${site.link}?sort=trending&search=${encodeURIComponent(searchQuery)}`;
      } else if (site.link.includes('kaggle.com')) {
        searchUrl = `${site.link}?search=${encodeURIComponent(searchQuery)}`;
      } else if (site.link.includes('datasetsearch.research.google.com')) {
        searchUrl = `${site.link}/search?query=${encodeURIComponent(searchQuery)}&src=0`;
      } else if (site.link.includes('paperswithcode.com')) {
        searchUrl = `${site.link}?q=${encodeURIComponent(searchQuery)}`;
      } else if (site.link.includes('modelscope.cn')) {
        searchUrl = `${site.link}?query=${encodeURIComponent(searchQuery)}`;
      } else if (site.link.includes('opendatalab.com')) {
        searchUrl = `${site.link}?keywords=${encodeURIComponent(searchQuery)}`;
      } else if (site.link.includes('tianchi.aliyun.com')) {
        searchUrl = `${site.link}?q=${encodeURIComponent(searchQuery)}`;
      } else {
        // 預設處理方式，在URL後新增搜尋引數
        searchUrl = `${site.link}${site.link.includes('?') ? '&' : '?'}search=${encodeURIComponent(searchQuery)}`;
      }

      // 儲存最近搜尋
      saveRecentSearch(searchQuery);

      window.open(searchUrl, '_blank');
    }
    setShowSuggestions(false);
  };

  // 處理點選外部關閉建議
  const handleClickAway = event => {
    // 確保點選的不是建議框本身
    if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
      setShowSuggestions(false);
    }
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ position: 'relative', width: '100%', zIndex: 1300 }} ref={searchRef}>
        <TextField
          fullWidth
          placeholder={t('datasetSquare.searchPlaceholder')}
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleSearchSubmit}
          onClick={() => searchQuery && setShowSuggestions(true)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
            sx: {
              height: 56,
              borderRadius: 3,
              backgroundColor:
                theme.palette.mode === 'dark'
                  ? alpha(theme.palette.background.default, 0.6)
                  : alpha(theme.palette.background.default, 0.8),
              backdropFilter: 'blur(8px)',
              px: 2,
              transition: 'all 0.3s ease',
              boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.15)}`,
              '&.MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'transparent'
                },
                '&:hover fieldset': {
                  borderColor: 'transparent'
                },
                '&.Mui-focused': {
                  boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.3)}`,
                  backgroundColor:
                    theme.palette.mode === 'dark'
                      ? alpha(theme.palette.background.paper, 0.8)
                      : alpha(theme.palette.common.white, 0.95)
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'transparent'
                }
              }
            }
          }}
          sx={{
            mb: 1,
            '& .MuiInputBase-input': {
              fontSize: '1rem',
              fontWeight: 500,
              color: theme.palette.text.primary
            },
            '& .MuiInputBase-input::placeholder': {
              color: alpha(theme.palette.text.primary, 0.6),
              opacity: 0.7
            }
          }}
        />

        {/* 搜尋建議下拉框 - 使用絕對定位確保不被裁剪 */}
        {showSuggestions && searchQuery && (
          <Box
            ref={suggestionsRef}
            sx={{
              position: 'absolute',
              width: '100%',
              zIndex: 9999,
              top: 'calc(100% + 8px)',
              left: 0,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              pointerEvents: 'auto' // 確保可以點選
            }}
          >
            <Fade in={showSuggestions}>
              <Paper
                elevation={6}
                sx={{
                  width: '100%',
                  maxHeight: 350,
                  overflow: 'auto',
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  position: 'relative'
                }}
              >
                <List>
                  {sites.slice(0, 5).map((site, index) => (
                    <ListItem key={index} disablePadding>
                      <ListItemButton
                        onClick={() => handleSuggestionClick(site)}
                        sx={{
                          py: 1.5,
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.05)
                          }
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    mr: 1.5,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main
                                  }}
                                >
                                  <TravelExploreIcon fontSize="small" />
                                </Avatar>
                                <Typography>
                                  {t('datasetSquare.searchVia')}{' '}
                                  <strong>{getSiteField(site, 'name', i18n.language)}</strong> Search
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                                  "{searchQuery}"
                                </Typography>
                                <LaunchIcon fontSize="small" color="action" />
                              </Box>
                            </Box>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Fade>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
