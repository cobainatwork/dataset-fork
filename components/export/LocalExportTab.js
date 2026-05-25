// LocalExportTab.js 元件
import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  TextField,
  Checkbox,
  Typography,
  Box,
  Paper,
  useTheme,
  Grid,
  Table,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress,
  Pagination
} from '@mui/material';

const LocalExportTab = ({
  fileFormat,
  formatType,
  systemPrompt,
  confirmedOnly,
  includeCOT,
  customFields,
  alpacaFieldType,
  customInstruction,
  reasoningLanguage,
  handleFileFormatChange,
  handleFormatChange,
  handleSystemPromptChange,
  handleReasoningLanguageChange,
  handleConfirmedOnlyChange,
  handleIncludeCOTChange,
  handleCustomFieldChange,
  handleIncludeLabelsChange,
  handleIncludeChunkChange,
  handleQuestionOnlyChange,
  handleAlpacaFieldTypeChange,
  handleCustomInstructionChange,
  handleExport,
  projectId
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  // Balance export related state
  const [balanceDialogOpen, setBalanceDialogOpen] = useState(false);
  const [tagStats, setTagStats] = useState([]);
  const [balanceConfig, setBalanceConfig] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [quickSetCount, setQuickSetCount] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const PAGE_SIZE = 100;

  // Get label statistics (changed to GET + query parameters)
  const fetchTagStats = async () => {
    try {
      setLoading(true);
      setError('');
      const url = `/api/projects/${projectId}/datasets/export?confirmed=${confirmedOnly ? 'true' : 'false'}`;
      const response = await fetch(url, { method: 'GET' });

      if (!response.ok) {
        throw new Error(t('errors.getTagStatsFailed'));
      }

      const stats = await response.json();
      setTagStats(stats);

      // 初始化平衡配置
      const initialConfig = stats.map(stat => ({
        tagLabel: stat.tagLabel,
        maxCount: Math.min(stat.datasetCount, 100), // 預設最多100條
        availableCount: stat.datasetCount
      }));

      setBalanceConfig(initialConfig);
      setCurrentPage(1);

      // 計算總數
      const total = initialConfig.reduce((sum, config) => sum + config.maxCount, 0);
      setTotalCount(total);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 開啟平衡匯出對話方塊
  const handleOpenBalanceDialog = () => {
    setBalanceDialogOpen(true);
    fetchTagStats();
  };

  // 更新單個標籤的數量配置
  const updateBalanceConfig = useCallback((tagLabel, newCount) => {
    setBalanceConfig(prevConfig => {
      let nextTotalCount = 0;
      const nextConfig = prevConfig.map(config => {
        if (config.tagLabel === tagLabel) {
          const count = Math.min(Math.max(0, parseInt(newCount, 10) || 0), config.availableCount);
          const updatedConfig = { ...config, maxCount: count };
          nextTotalCount += updatedConfig.maxCount;
          return updatedConfig;
        }

        nextTotalCount += config.maxCount;
        return config;
      });

      setTotalCount(nextTotalCount);
      return nextConfig;
    });
  }, []);

  // 一鍵設定所有標籤為相同數量
  const setAllToSameCount = useCallback(count => {
    const parsedCount = parseInt(count, 10) || 0;

    setBalanceConfig(prevConfig => {
      let nextTotalCount = 0;
      const nextConfig = prevConfig.map(config => {
        const maxCount = Math.min(Math.max(0, parsedCount), config.availableCount);
        nextTotalCount += maxCount;
        return {
          ...config,
          maxCount
        };
      });

      setTotalCount(nextTotalCount);
      return nextConfig;
    });
  }, []);

  const deferredBalanceConfig = useDeferredValue(balanceConfig);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(deferredBalanceConfig.length / PAGE_SIZE)),
    [deferredBalanceConfig]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedBalanceConfig = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return deferredBalanceConfig.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, deferredBalanceConfig]);

  const handleQuickSetInputChange = event => {
    setQuickSetCount(event.target.value);
  };

  const applyQuickSetCount = () => {
    setAllToSameCount(quickSetCount);
  };

  const handleQuickSetKeyDown = event => {
    if (event.key === 'Enter') {
      applyQuickSetCount();
    }
  };

  const handlePageChange = (_event, page) => {
    setCurrentPage(page);
  };

  // 處理平衡匯出
  const handleBalancedExport = () => {
    // 過濾出數量大於0的配置
    const validConfig = balanceConfig.filter(config => config.maxCount > 0);

    if (validConfig.length === 0) {
      setError(t('export.balancedExport.atLeastOneTag', '請至少為一個標籤設定大於0的數量'));
      return;
    }

    // 呼叫原有的匯出函式，但傳遞平衡配置
    handleExport({
      balanceMode: true,
      balanceConfig: validConfig,
      formatType,
      systemPrompt,
      reasoningLanguage,
      confirmedOnly,
      fileFormat,
      includeCOT,
      alpacaFieldType,
      customInstruction,
      customFields: formatType === 'custom' ? customFields : undefined
    });

    setBalanceDialogOpen(false);
  };

  // 自定義格式的示例
  const getCustomFormatExample = () => {
    const { questionField, answerField, cotField, includeLabels, includeChunk } = customFields;
    const example = {
      [questionField]: t('sampleData.questionContent'),
      [answerField]: t('sampleData.answerContent')
    };

    // 如果包含思維鏈欄位，新增到示例中
    if (includeCOT) {
      example[cotField] = t('sampleData.cotContent');
    }

    if (includeLabels) {
      example.labels = [t('sampleData.domainLabel')];
    }

    if (includeChunk) {
      example.chunk = t('sampleData.textChunk');
    }

    return fileFormat === 'json' ? JSON.stringify([example], null, 2) : JSON.stringify(example);
  };

  // CSV 自定義格式化示例
  const getPreviewData = () => {
    if (formatType === 'alpaca') {
      // 根據選擇的欄位型別生成不同的示例
      if (alpacaFieldType === 'instruction') {
        return {
          headers: ['instruction', 'input', 'output', 'system'],
          rows: [
            {
              instruction: t('export.sampleInstruction', '人類指令（必填）'),
              input: '',
              output: t('export.sampleOutput', '模型回答（必填）'),
              system: t('export.sampleSystem', '系統提示詞（選填）')
            },
            {
              instruction: t('export.sampleInstruction2', '第二個指令'),
              input: '',
              output: t('export.sampleOutput2', '第二個回答'),
              system: t('export.sampleSystemShort', '系統提示詞')
            }
          ]
        };
      } else {
        // input
        return {
          headers: ['instruction', 'input', 'output', 'system'],
          rows: [
            {
              instruction: customInstruction || t('export.fixedInstruction', '固定的指令內容'),
              input: t('export.sampleInput', '人類問題（必填）'),
              output: t('export.sampleOutput', '模型回答（必填）'),
              system: t('export.sampleSystem', '系統提示詞（選填）')
            },
            {
              instruction: customInstruction || t('export.fixedInstruction', '固定的指令內容'),
              input: t('export.sampleInput2', '第二個問題'),
              output: t('export.sampleOutput2', '第二個回答'),
              system: t('export.sampleSystemShort', '系統提示詞')
            }
          ]
        };
      }
    } else if (formatType === 'sharegpt') {
      return {
        headers: ['messages'],
        rows: [
          {
            messages: JSON.stringify(
              [
                {
                  messages: [
                    {
                      role: 'system',
                      content: t('export.sampleSystem', '系統提示詞（選填）')
                    },
                    {
                      role: 'user',
                      content: t('export.sampleUserMessage', '人類指令') // 對映到 question 欄位
                    },
                    {
                      role: 'assistant',
                      content: t('export.sampleAssistantMessage', '模型回答') // 對映到 cot+answer 欄位
                    }
                  ]
                }
              ],
              null,
              2
            )
          }
        ]
      };
    } else if (formatType === 'multilingualthinking') {
      return {
        headers: 'messages',
        rows: {
          messages: JSON.stringify(
            {
              reasoning_language: 'English',
              developer: t('export.sampleSystem', '系統提示詞（選填）'),
              user: t('export.sampleUserMessage', '人類指令'), // 對映到 question 欄位
              analysis: t('export.sampleAnalysis', '模型的思維鏈內容'), // 對映到 cot 欄位
              final: t('export.sampleFinal', '模型回答'), // 對映到 answer 欄位
              messages: [
                {
                  role: 'system',
                  content: '系統提示詞（選填）',
                  thinking: 'null'
                },
                {
                  role: 'user',
                  content: '人類指令', // 對映到 question 欄位
                  thinking: 'null'
                },
                {
                  role: 'assistant',
                  content: '模型回答', // 對映到 answer 欄位
                  thinking: '模型的思維鏈內容' // 對映到 cot 欄位
                }
              ]
            },
            null,
            2
          )
        }
      };
    } else if (formatType === 'custom') {
      // 如果選擇僅匯出問題，只包含問題欄位
      if (customFields.questionOnly) {
        const headers = [customFields.questionField];
        if (customFields.includeLabels) headers.push('labels');
        if (customFields.includeChunk) headers.push('chunk');

        const row = {
          [customFields.questionField]: t('sampleData.questionContent')
        };
        if (customFields.includeLabels) row.labels = t('sampleData.domainLabel');
        if (customFields.includeChunk) row.chunk = t('sampleData.textChunk');
        return {
          headers,
          rows: [row]
        };
      } else {
        // 正常的自定義格式
        const headers = [customFields.questionField, customFields.answerField];
        if (includeCOT) headers.push(customFields.cotField);
        if (customFields.includeLabels) headers.push('labels');
        if (customFields.includeChunk) headers.push('chunk');

        const row = {
          [customFields.questionField]: t('sampleData.questionContent'),
          [customFields.answerField]: t('sampleData.answerContent')
        };
        if (includeCOT) row[customFields.cotField] = t('sampleData.cotContent');
        if (customFields.includeLabels) row.labels = t('sampleData.domainLabel');
        if (customFields.includeChunk) row.chunk = t('sampleData.textChunk');
        return {
          headers,
          rows: [row]
        };
      }
    }
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('export.fileFormat')}
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup
            aria-label="fileFormat"
            name="fileFormat"
            value={fileFormat}
            onChange={handleFileFormatChange}
            row
          >
            <FormControlLabel value="json" control={<Radio />} label="JSON" />
            <FormControlLabel value="jsonl" control={<Radio />} label="JSONL" />
            {/* <FormControlLabel value="csv" control={<Radio />} label="CSV" /> */}
            <FormControlLabel
              value="csv"
              control={<Radio disabled={formatType === 'multilingualthinking'} />}
              label="CSV"
            />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* 資料集風格 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('export.format')}
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup aria-label="format" name="format" value={formatType} onChange={handleFormatChange} row>
            <FormControlLabel value="alpaca" control={<Radio />} label="Alpaca" />
            <FormControlLabel value="sharegpt" control={<Radio />} label="ShareGPT" />
            {/* NEW: Multilingual‑Thinking format */}
            <FormControlLabel
              value="multilingualthinking"
              control={<Radio disabled={fileFormat === 'csv'} />}
              label={t('export.multilingualThinkingFormat') || 'Multilingual‑Thinking'}
            />
            <FormControlLabel value="custom" control={<Radio />} label={t('export.customFormat')} />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Alpaca 格式特有的設定 */}
      {formatType === 'alpaca' && (
        <Box sx={{ mb: 3, pl: 2, borderLeft: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('export.alpacaSettings', 'Alpaca 格式設定')}
          </Typography>
          <FormControl component="fieldset">
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {t('export.questionFieldType', '問題欄位型別')}
            </Typography>
            <RadioGroup
              aria-label="alpacaFieldType"
              name="alpacaFieldType"
              value={alpacaFieldType}
              onChange={handleAlpacaFieldTypeChange}
              row
            >
              <FormControlLabel
                value="instruction"
                control={<Radio />}
                label={t('export.useInstruction', '使用 instruction 欄位')}
              />
              <FormControlLabel value="input" control={<Radio />} label={t('export.useInput', '使用 input 欄位')} />
            </RadioGroup>

            {alpacaFieldType === 'input' && (
              <TextField
                fullWidth
                size="small"
                label={t('export.customInstruction', '自定義 instruction 欄位內容')}
                value={customInstruction}
                onChange={handleCustomInstructionChange}
                margin="normal"
                placeholder={t('export.instructionPlaceholder', '請輸入固定的指令內容')}
                helperText={t(
                  'export.instructionHelperText',
                  '當使用 input 欄位時，可以在這裡指定固定的 instruction 內容'
                )}
              />
            )}
          </FormControl>
        </Box>
      )}

      {/* 自定義格式選項 */}
      {formatType === 'custom' && (
        <Box sx={{ mb: 3, pl: 2, borderLeft: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="subtitle2" gutterBottom>
            {t('export.customFormatSettings')}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={t('export.questionFieldName')}
                value={customFields.questionField}
                onChange={handleCustomFieldChange('questionField')}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={t('export.answerFieldName')}
                value={customFields.answerField}
                onChange={handleCustomFieldChange('answerField')}
                margin="normal"
              />
            </Grid>
            {/* 新增思維鏈欄位名輸入框 */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={t('export.cotFieldName')}
                value={customFields.cotField}
                onChange={handleCustomFieldChange('cotField')}
                margin="normal"
              />
            </Grid>
          </Grid>
          <FormControlLabel
            control={
              <Checkbox checked={customFields.includeLabels} onChange={handleIncludeLabelsChange} size="small" />
            }
            label={t('export.includeLabels')}
          />
          <FormControlLabel
            control={<Checkbox checked={customFields.includeChunk} onChange={handleIncludeChunkChange} size="small" />}
            label={t('export.includeChunk')}
          />
          <FormControlLabel
            control={<Checkbox checked={customFields.questionOnly} onChange={handleQuestionOnlyChange} size="small" />}
            label={t('export.questionOnly')}
          />
        </Box>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('export.example')}
        </Typography>

        {fileFormat === 'csv' ? (
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            {(() => {
              const { headers, rows } = getPreviewData();
              const tableKey = `${formatType}-${fileFormat}-${JSON.stringify(customFields)}`;
              return (
                <Table size="small" key={tableKey}>
                  <TableHead>
                    <TableRow>
                      {headers.map(header => (
                        <TableCell key={header}>{header}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={index}>
                        {headers.map(header => (
                          <TableCell key={header}>
                            {Array.isArray(row[header]) ? row[header].join(', ') : row[header] || ''}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              );
            })()}
          </TableContainer>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
              overflowX: 'auto'
            }}
          >
            <pre style={{ margin: 0 }}>
              {formatType === 'custom'
                ? getCustomFormatExample()
                : formatType === 'multilingualthinking'
                  ? fileFormat === 'json'
                    ? JSON.stringify(
                        {
                          reasoning_language: 'English',
                          developer: '系統提示詞（選填）',
                          user: '人類指令', // 對映到 question 欄位
                          analysis: '模型的思維鏈內容', // 對映到 cot 欄位
                          final: '模型回答', // 對映到 answer 欄位
                          messages: [
                            {
                              content: t('export.sampleSystem', '系統提示詞（選填）'),
                              role: 'system',
                              thinking: null
                            },
                            {
                              content: t('export.sampleUserMessage', '人類指令'),
                              role: 'user',
                              thinking: null
                            },
                            {
                              content: t('export.sampleAssistantMessage', '模型回答'),
                              role: 'assistant',
                              thinking: t('export.sampleThinking', '模型的思維鏈內容')
                            }
                          ]
                        },
                        null,
                        2
                      )
                    : '{"reasoning_language": "English","developer": "系統提示詞（選填）", "user": "人類指令", "analysis": "模型的思維鏈內容", "final": "模型回答", "messages": [{"role": "user", "content": "人類指令", "thinking": "null"}, {"role": "assistant", "content": "模型回答", "thinking": "模型的思維鏈內容"}]}'
                  : formatType === 'alpaca'
                    ? fileFormat === 'json'
                      ? JSON.stringify(
                          [
                            {
                              instruction: t('export.sampleInstruction', '人類指令（必填）'), // 對映到 question 欄位
                              input: t('export.sampleInputOptional', '人類輸入（選填）'),
                              output: t('export.sampleOutput', '模型回答（必填）'), // 對映到 cot+answer 欄位
                              system: t('export.sampleSystem', '系統提示詞（選填）')
                            }
                          ],
                          null,
                          2
                        )
                      : '{"instruction": "人類指令（必填）", "input": "人類輸入（選填）", "output": "模型回答（必填）", "system": "系統提示詞（選填）"}\n{"instruction": "第二個指令", "input": "", "output": "第二個回答", "system": "系統提示詞"}'
                    : fileFormat === 'json'
                      ? JSON.stringify(
                          [
                            {
                              messages: [
                                {
                                  role: 'system',
                                  content: t('export.sampleSystem', '系統提示詞（選填）')
                                },
                                {
                                  role: 'user',
                                  content: t('export.sampleUserMessage', '人類指令') // 對映到 question 欄位
                                },
                                {
                                  role: 'assistant',
                                  content: t('export.sampleAssistantMessage', '模型回答') // 對映到 cot+answer 欄位
                                }
                              ]
                            }
                          ],
                          null,
                          2
                        )
                      : '{"messages": [{"role": "system", "content": "系統提示詞（選填）"}, {"role": "user", "content": "人類指令"}, {"role": "assistant", "content": "模型回答"}]}\n{"messages": [{"role": "user", "content": "第二個問題"}, {"role": "assistant", "content": "第二個回答"}]}'}
            </pre>
          </Paper>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          {t('export.systemPrompt')}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          placeholder={t('export.systemPromptPlaceholder')}
          value={systemPrompt}
          onChange={handleSystemPromptChange}
        />
      </Box>
      {/* Reasoning language – only for multilingual‑thinking */}
      {formatType === 'multilingualthinking' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            {t('export.Reasoninglanguage')}
          </Typography>
          <TextField
            fullWidth
            rows={3}
            multiline
            variant="outlined"
            placeholder={t('export.ReasoninglanguagePlaceholder')}
            value={reasoningLanguage}
            onChange={handleReasoningLanguageChange}
          />
        </Box>
      )}
      <Box sx={{ mb: 2, display: 'flex', flexDirection: 'row', gap: 4 }}>
        <FormControlLabel
          control={<Checkbox checked={confirmedOnly} onChange={handleConfirmedOnlyChange} />}
          label={t('export.onlyConfirmed')}
        />

        <FormControlLabel
          control={<Checkbox checked={includeCOT} onChange={handleIncludeCOTChange} />}
          label={t('export.includeCOT')}
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
        <Button onClick={handleOpenBalanceDialog} variant="outlined" sx={{ borderRadius: 2 }}>
          {t('exportDialog.balancedExport')}
        </Button>
        <Button onClick={handleExport} variant="contained" sx={{ borderRadius: 2 }}>
          {t('export.confirmExport')}
        </Button>
      </Box>

      {/* 平衡匯出對話方塊 */}
      <Dialog
        open={balanceDialogOpen}
        onClose={() => setBalanceDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2
          }
        }}
      >
        <DialogTitle>{t('exportDialog.balancedExportTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
            {t('exportDialog.balancedExportDescription')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* 批次設定 */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('exportDialog.quickSettings')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Button size="small" onClick={() => setAllToSameCount(50)}>
                    {t('exportDialog.setAllTo50')}
                  </Button>
                  <Button size="small" onClick={() => setAllToSameCount(100)}>
                    {t('exportDialog.setAllTo100')}
                  </Button>
                  <Button size="small" onClick={() => setAllToSameCount(200)}>
                    {t('exportDialog.setAllTo200')}
                  </Button>
                  <TextField
                    size="small"
                    type="number"
                    value={quickSetCount}
                    placeholder={t('exportDialog.customAmount')}
                    sx={{ width: 120 }}
                    onChange={handleQuickSetInputChange}
                    onKeyDown={handleQuickSetKeyDown}
                  />
                  <Button size="small" variant="outlined" onClick={applyQuickSetCount}>
                    {t('common.apply', '應用')}
                  </Button>
                </Box>
              </Box>

              {/* 標籤配置表格 */}
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('exportDialog.tagName')}</TableCell>
                      <TableCell align="right">{t('exportDialog.availableCount')}</TableCell>
                      <TableCell align="right">{t('exportDialog.exportCount')}</TableCell>
                      <TableCell align="right">{t('exportDialog.settings')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedBalanceConfig.map(config => (
                      <TableRow key={config.tagLabel}>
                        <TableCell>
                          <Chip label={config.tagLabel} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{config.availableCount}</TableCell>
                        <TableCell align="right">
                          <strong>{config.maxCount}</strong>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={config.maxCount}
                            onChange={e => updateBalanceConfig(config.tagLabel, e.target.value)}
                            inputProps={{
                              min: 0,
                              max: config.availableCount,
                              style: { textAlign: 'right' }
                            }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages > 1 && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    color="primary"
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    size="small"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}

              {/* 統計資訊 */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                <Typography variant="body2">
                  <strong>
                    {t('exportDialog.totalExportCount')}: {totalCount}
                  </strong>{' '}
                  | {t('exportDialog.tagCount')}: {balanceConfig.filter(c => c.maxCount > 0).length} /{' '}
                  {balanceConfig.length}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBalanceDialogOpen(false)}>{t('common.cancel', '取消')}</Button>
          <Button variant="contained" onClick={handleBalancedExport} disabled={loading || totalCount === 0}>
            {t('exportDialog.export')} ({totalCount})
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LocalExportTab;
