import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Box, Grid, Card, CardContent } from '@mui/material';
import { fetchWithRetry } from '@/lib/util/request';
import { useSnackbar } from '@/hooks/useSnackbar';

// 匯入拆分後的元件
import CategoryTabs from './CategoryTabs';
import PromptList from './PromptList';
import PromptDetail from './PromptDetail';
import PromptEditDialog from './PromptEditDialog';
import { getLanguageFromPromptKey, shouldShowPrompt } from './promptUtils';

/**
 * 提示詞設定主元件
 */
export default function PromptSettings() {
  const { projectId } = useParams();
  const { i18n, t } = useTranslation();
  const { showSuccess, showErrorMessage, SnackbarComponent } = useSnackbar();

  // 基礎狀態
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState({});
  const [customPrompts, setCustomPrompts] = useState([]);

  // 當前選中狀態
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [promptContent, setPromptContent] = useState('');

  // 編輯對話方塊狀態
  const [editDialog, setEditDialog] = useState({
    open: false,
    promptType: '',
    promptKey: '',
    language: '',
    content: '',
    defaultContent: '',
    isNew: false
  });

  // ======= 資料載入與初始化 =======

  // 載入提示詞資料
  useEffect(() => {
    loadPromptData();
  }, [projectId, currentLanguage]);

  // 監聽語言變化
  useEffect(() => {
    const newLang = i18n.language;
    if (newLang !== currentLanguage) {
      setCurrentLanguage(newLang);
    }
  }, [i18n.language, currentLanguage]);

  // 監聽選中提示詞變化
  useEffect(() => {
    if (selectedPrompt) {
      loadPromptContent();
    }
  }, [selectedPrompt]);

  // 初始化選擇第一個分類和提示詞
  useEffect(() => {
    if (Object.keys(templates).length > 0 && currentLanguage && !selectedCategory) {
      const firstCategory = Object.keys(templates)[0];
      setSelectedCategory(firstCategory);

      // 根據當前語言環境選擇第一個匹配的提示詞
      const promptEntries = Object.keys(templates[firstCategory]?.prompts || {});
      const firstPrompt = promptEntries.find(promptKey => shouldShowPrompt(promptKey, currentLanguage));

      if (firstPrompt) {
        setSelectedPrompt(firstPrompt);
      }
    }
  }, [templates, selectedCategory, currentLanguage]);

  // ======= API 操作函式 =======

  // 載入提示詞資料
  const loadPromptData = async () => {
    try {
      setLoading(true);
      const response = await fetchWithRetry(`/api/projects/${projectId}/custom-prompts?language=${currentLanguage}`);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
        setCustomPrompts(data.customPrompts);
      } else {
        showErrorMessage(data.message || '載入提示詞資料失敗');
      }
    } catch (error) {
      console.error('載入提示詞資料出錯:', error);
      showErrorMessage('載入提示詞資料失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入提示詞內容
  const loadPromptContent = async (forceRefresh = false) => {
    if (!selectedPrompt) return;
    try {
      setLoading(true);
      const content = await getCurrentPromptContent(selectedPrompt, forceRefresh);
      setPromptContent(content);
    } catch (error) {
      console.error('載入提示詞內容出錯:', error);
      showErrorMessage('載入提示詞內容失敗');
    } finally {
      setLoading(false);
    }
  };

  // 載入預設提示詞內容
  const loadDefaultContent = async (promptType, promptKey) => {
    if (i18n.language === 'en' && !promptKey.endsWith('_EN')) {
      promptKey += '_EN';
    } else if (i18n.language === 'tr' && !promptKey.endsWith('_TR')) {
      promptKey += '_TR';
    }
    try {
      const response = await fetchWithRetry(
        `/api/projects/${projectId}/default-prompts?promptType=${promptType}&promptKey=${promptKey}`
      );
      const data = await response.json();

      if (data.success) {
        return data.content;
      }
      return '';
    } catch (error) {
      console.error('載入預設提示詞內容出錯:', error);
      return '';
    }
  };

  // ======= 互動處理函式 =======

  // 處理編輯提示詞
  const handleEditPrompt = async (promptType, promptKey, language) => {
    const existingPrompt = customPrompts.find(
      p => p.promptType === promptType && p.promptKey === promptKey && p.language === language
    );

    const defaultContent = await loadDefaultContent(promptType, promptKey);

    setEditDialog({
      open: true,
      promptType,
      promptKey,
      language,
      content: existingPrompt?.content || defaultContent,
      defaultContent,
      isNew: !existingPrompt
    });
  };

  // 處理刪除提示詞
  const handleDeletePrompt = async (promptType, promptKey, language) => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        promptType,
        promptKey,
        language
      }).toString();

      const response = await fetchWithRetry(`/api/projects/${projectId}/custom-prompts?${query}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        showSuccess(t('settings.prompts.restoreSuccess'));
        // 先重新載入資料，然後強制重新整理內容
        await loadPromptData();
        await loadPromptContent(true); // 強制重新整理
      } else {
        showErrorMessage(data.message || t('settings.prompts.restoreFailed'));
      }
    } catch (error) {
      console.error(t('settings.prompts.deleteError'), error);
      showErrorMessage(t('settings.prompts.restoreFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 處理儲存提示詞
  const handleSavePrompt = async () => {
    try {
      setLoading(true);
      const { promptType, promptKey, language, content } = editDialog;

      const response = await fetchWithRetry(`/api/projects/${projectId}/custom-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptType, promptKey, language, content })
      });
      const data = await response.json();

      if (data.success) {
        showSuccess(t('settings.prompts.saveSuccess'));
        setEditDialog({ ...editDialog, open: false });
        // 先重新載入資料，然後強制重新整理內容
        await loadPromptData();
        await loadPromptContent(true); // 強制重新整理
      } else {
        showErrorMessage(data.message || t('settings.prompts.saveFailed'));
      }
    } catch (error) {
      console.error(t('settings.prompts.saveError'), error);
      showErrorMessage(t('settings.prompts.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 恢復預設內容
  const handleRestoreDefault = () => {
    setEditDialog(prev => ({
      ...prev,
      content: prev.defaultContent
    }));
  };

  // ======= 工具函式 =======

  // 檢查提示詞是否已自定義
  const isCustomized = promptKey => {
    if (!selectedCategory || !promptKey || !templates[selectedCategory]) return false;

    const language = getLanguageFromPromptKey(promptKey);
    const promptType = templates[selectedCategory]?.prompts?.[promptKey]?.type;

    if (!promptType) return false;

    return customPrompts.some(p => p.promptType === promptType && p.promptKey === promptKey && p.language === language);
  };

  // 獲取當前提示詞內容（直接從伺服器獲取最新資料）
  const getCurrentPromptContent = async (promptKey, forceRefresh = false) => {
    if (!selectedCategory || !promptKey || !templates[selectedCategory]) return '';

    const language = getLanguageFromPromptKey(promptKey);
    const promptType = templates[selectedCategory]?.prompts?.[promptKey]?.type;

    if (!promptType) {
      return '';
    }

    // 如果需要強制重新整理，直接從伺服器獲取
    if (forceRefresh) {
      try {
        const response = await fetchWithRetry(
          `/api/projects/${projectId}/custom-prompts?promptType=${promptType}&language=${language}`
        );
        const data = await response.json();

        if (data.success) {
          const existingPrompt = data.customPrompts.find(
            p => p.promptType === promptType && p.promptKey === promptKey && p.language === language
          );

          if (existingPrompt) {
            return existingPrompt.content;
          }
        }
      } catch (error) {
        console.error(t('settings.prompts.fetchContentError'), error);
      }
    } else {
      // 使用快取的狀態
      const existingPrompt = customPrompts.find(
        p => p.promptType === promptType && p.promptKey === promptKey && p.language === language
      );

      if (existingPrompt) {
        return existingPrompt.content;
      }
    }

    // 回退到預設內容
    return await loadDefaultContent(promptType, promptKey);
  };

  // ======= 資料準備 =======

  // 當前分類的配置
  const currentCategoryConfig = templates[selectedCategory];

  // 當前提示詞的配置
  const currentPromptConfig = currentCategoryConfig?.prompts?.[selectedPrompt];

  // 分類配置項
  const categoryEntries = Object.entries(templates);

  // 處理分類變更
  const handleCategoryChange = newCategory => {
    setSelectedCategory(newCategory);
    // 根據當前語言環境選擇第一個匹配的提示詞
    const promptEntries = Object.keys(templates[newCategory]?.prompts || {});
    console.log('所有提示詞:', promptEntries);

    const firstPrompt = promptEntries.find(promptKey => shouldShowPrompt(promptKey, currentLanguage));

    setSelectedPrompt(firstPrompt);
  };

  // 處理編輯按鈕點選
  const handleEditButtonClick = () => {
    const promptType = templates[selectedCategory]?.prompts?.[selectedPrompt]?.type;
    // 使用當前介面語言而不是從 promptKey 推斷的語言
    const language = currentLanguage;

    if (promptType) {
      handleEditPrompt(promptType, selectedPrompt, language);
    }
  };

  // 處理刪除按鈕點選
  const handleDeleteButtonClick = () => {
    const promptType = templates[selectedCategory]?.prompts?.[selectedPrompt]?.type;
    // 使用當前介面語言而不是從 promptKey 推斷的語言
    const language = currentLanguage;

    if (promptType) {
      handleDeletePrompt(promptType, selectedPrompt, language);
    }
  };

  // 處理對話方塊內容變更
  const handleDialogContentChange = newContent => {
    setEditDialog({ ...editDialog, content: newContent });
  };

  return (
    <Box>
      <SnackbarComponent />

      {/* 主要分類選擇 */}
      <CategoryTabs
        categoryEntries={categoryEntries}
        selectedCategory={selectedCategory}
        currentLanguage={currentLanguage}
        onCategoryChange={handleCategoryChange}
      />

      {/* 左右佈局：左側垂直提示詞選擇，右側內容展示 */}
      <Grid container spacing={3}>
        {/* 左側：垂直 TAB 選擇具體提示詞 */}
        <Grid item xs={12} md={4} lg={3}>
          <Card>
            <CardContent>
              <PromptList
                currentCategory={selectedCategory}
                currentCategoryConfig={currentCategoryConfig}
                selectedPrompt={selectedPrompt}
                currentLanguage={currentLanguage}
                isCustomized={isCustomized}
                onPromptSelect={setSelectedPrompt}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* 右側：提示詞內容展示和操作 */}
        <Grid item xs={12} md={8} lg={9}>
          <PromptDetail
            currentPromptConfig={currentPromptConfig}
            selectedPrompt={selectedPrompt}
            promptContent={promptContent}
            isCustomized={isCustomized}
            onEditClick={handleEditButtonClick}
            onDeleteClick={handleDeleteButtonClick}
          />
        </Grid>
      </Grid>

      {/* 編輯提示詞對話方塊 */}
      <PromptEditDialog
        open={editDialog.open}
        title={editDialog.isNew ? t('settings.prompts.createCustomPrompt') : t('settings.prompts.editPrompt')}
        promptType={editDialog.promptType}
        promptKey={editDialog.promptKey}
        content={editDialog.content}
        loading={loading}
        onClose={() => setEditDialog({ ...editDialog, open: false })}
        onSave={handleSavePrompt}
        onRestore={handleRestoreDefault}
        onContentChange={handleDialogContentChange}
      />
    </Box>
  );
}
