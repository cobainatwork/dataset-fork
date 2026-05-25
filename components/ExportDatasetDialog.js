// ExportDatasetDialog.js 元件
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Tabs, Tab } from '@mui/material';

// 匯入拆分後的元件
import LocalExportTab from './export/LocalExportTab';
import LlamaFactoryTab from './export/LlamaFactoryTab';
import HuggingFaceTab from './export/HuggingFaceTab';

const ExportDatasetDialog = ({ open, onClose, onExport, projectId }) => {
  const { t } = useTranslation();
  const [formatType, setFormatType] = useState('alpaca');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [reasoningLanguage, setReasoningLanguage] = useState('');
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [fileFormat, setFileFormat] = useState('json');
  const [includeCOT, setIncludeCOT] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  // alpaca 格式特有的設定
  const [alpacaFieldType, setAlpacaFieldType] = useState('instruction'); // 'instruction' 或 'input'
  const [customInstruction, setCustomInstruction] = useState(''); // 當選擇 input 時使用的自定義 instruction
  const [customFields, setCustomFields] = useState({
    questionField: 'instruction',
    answerField: 'output',
    cotField: 'complexCOT', // 新增思維鏈欄位名
    includeLabels: false,
    includeChunk: false, // 新增是否包含chunk欄位
    questionOnly: false // 新增僅匯出問題選項
  });

  const handleFileFormatChange = event => {
    setFileFormat(event.target.value);
  };

  const handleFormatChange = event => {
    setFormatType(event.target.value);
    // 根據格式型別設定預設欄位名
    if (event.target.value === 'alpaca') {
      setCustomFields({
        ...customFields,
        questionField: 'instruction',
        answerField: 'output'
      });
    } else if (event.target.value === 'sharegpt') {
      setCustomFields({
        ...customFields,
        questionField: 'content',
        answerField: 'content'
      });
    } else if (event.target.value === 'multilingual-thinking') {
      setCustomFields({
        ...customFields,
        questionField: 'content',
        answerField: 'content'
      });
    } else if (event.target.value === 'custom') {
      // 自定義格式保持當前值
    }
  };

  const handleSystemPromptChange = event => {
    setSystemPrompt(event.target.value);
  };

  const handleReasoningLanguageChange = event => {
    setReasoningLanguage(event.target.value);
  };
  const handleConfirmedOnlyChange = event => {
    setConfirmedOnly(event.target.checked);
  };

  // 新增處理函式
  const handleIncludeCOTChange = event => {
    setIncludeCOT(event.target.checked);
  };

  const handleCustomFieldChange = field => event => {
    setCustomFields({
      ...customFields,
      [field]: event.target.value
    });
  };

  const handleIncludeLabelsChange = event => {
    setCustomFields({
      ...customFields,
      includeLabels: event.target.checked
    });
  };

  const handleIncludeChunkChange = event => {
    setCustomFields({
      ...customFields,
      includeChunk: event.target.checked
    });
  };

  const handleQuestionOnlyChange = event => {
    setCustomFields({
      ...customFields,
      questionOnly: event.target.checked
    });
  };

  // 處理 Alpaca 欄位型別變更
  const handleAlpacaFieldTypeChange = event => {
    setAlpacaFieldType(event.target.value);
  };

  // 處理自定義 instruction 變更
  const handleCustomInstructionChange = event => {
    setCustomInstruction(event.target.value);
  };

  const handleExport = options => {
    // 如果 LocalExportTab 傳入了完整的匯出配置（例如平衡匯出），直接使用該配置
    if (options && typeof options === 'object' && options.balanceMode) {
      onExport(options);
      return;
    }

    // 否則使用當前對話方塊內的狀態組裝匯出配置
    onExport({
      formatType,
      systemPrompt,
      reasoningLanguage,
      confirmedOnly,
      fileFormat,
      includeCOT,
      alpacaFieldType, // 新增 alpaca 欄位型別
      customInstruction, // 新增自定義 instruction
      customFields: formatType === 'custom' ? customFields : undefined
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>{t('export.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} aria-label="export tabs">
            <Tab label={t('export.localTab')} />
            <Tab label={t('export.llamaFactoryTab')} />
            <Tab label={t('export.huggingFaceTab')} />
          </Tabs>
        </Box>

        {/* 第一個標籤頁：本地匯出 */}
        {currentTab === 0 && (
          <LocalExportTab
            fileFormat={fileFormat}
            formatType={formatType}
            systemPrompt={systemPrompt}
            reasoningLanguage={reasoningLanguage}
            confirmedOnly={confirmedOnly}
            includeCOT={includeCOT}
            customFields={customFields}
            alpacaFieldType={alpacaFieldType}
            customInstruction={customInstruction}
            handleFileFormatChange={handleFileFormatChange}
            handleFormatChange={handleFormatChange}
            handleSystemPromptChange={handleSystemPromptChange}
            handleReasoningLanguageChange={handleReasoningLanguageChange}
            handleConfirmedOnlyChange={handleConfirmedOnlyChange}
            handleIncludeCOTChange={handleIncludeCOTChange}
            handleCustomFieldChange={handleCustomFieldChange}
            handleIncludeLabelsChange={handleIncludeLabelsChange}
            handleIncludeChunkChange={handleIncludeChunkChange}
            handleQuestionOnlyChange={handleQuestionOnlyChange}
            handleAlpacaFieldTypeChange={handleAlpacaFieldTypeChange}
            handleCustomInstructionChange={handleCustomInstructionChange}
            handleExport={handleExport}
            projectId={projectId}
          />
        )}

        {/* 第二個標籤頁：Llama Factory */}
        {currentTab === 1 && (
          <LlamaFactoryTab
            projectId={projectId}
            systemPrompt={systemPrompt}
            reasoningLanguage={reasoningLanguage}
            confirmedOnly={confirmedOnly}
            includeCOT={includeCOT}
            formatType={formatType}
            handleSystemPromptChange={handleSystemPromptChange}
            handleReasoningLanguageChange={handleReasoningLanguageChange}
            handleConfirmedOnlyChange={handleConfirmedOnlyChange}
            handleIncludeCOTChange={handleIncludeCOTChange}
          />
        )}

        {/* 第三個標籤頁：HuggingFace */}
        {currentTab === 2 && (
          <HuggingFaceTab
            projectId={projectId}
            systemPrompt={systemPrompt}
            reasoningLanguage={reasoningLanguage}
            confirmedOnly={confirmedOnly}
            includeCOT={includeCOT}
            formatType={formatType}
            fileFormat={fileFormat}
            customFields={customFields}
            handleSystemPromptChange={handleSystemPromptChange}
            handleReasoningLanguageChange={handleReasoningLanguageChange}
            handleConfirmedOnlyChange={handleConfirmedOnlyChange}
            handleIncludeCOTChange={handleIncludeCOTChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExportDatasetDialog;
