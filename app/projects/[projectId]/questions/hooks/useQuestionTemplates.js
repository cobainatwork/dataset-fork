import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/**
 * 問題模板管理 Hook
 * @param {string} projectId - 專案ID
 * @param {string} sourceType - 資料來源型別: 'image' | 'text' | null (null表示獲取所有)
 */
export function useQuestionTemplates(projectId, sourceType = null) {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // 獲取模板列表
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = sourceType ? `?sourceType=${sourceType}` : '';
      const response = await axios.get(`/api/projects/${projectId}/questions/templates${params}`);
      if (response.data.success) {
        setTemplates(response.data.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast.error(t('questions.fetchTemplatesFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 建立模板
  const createTemplate = async data => {
    try {
      const response = await axios.post(`/api/projects/${projectId}/questions/templates`, data);
      if (response.data.success) {
        const { template, generation } = response.data;

        // 顯示模板建立成功訊息
        toast.success(t('questions.createTemplateSuccess'));

        // 如果有自動生成結果，顯示相應訊息
        if (generation) {
          if (generation.success) {
            if (generation.successCount > 0) {
              toast.success(
                t('questions.template.autoGenerateSuccess', {
                  count: generation.successCount
                })
              );
            }
            if (generation.failCount > 0) {
              toast.warning(
                t('questions.template.autoGeneratePartialFail', {
                  success: generation.successCount,
                  fail: generation.failCount
                })
              );
            }
          } else {
            toast.error(generation.message || t('questions.template.autoGenerateFailed'));
          }
        }

        fetchTemplates();
        return template;
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      toast.error(t('questions.createTemplateFailed'));
      throw error;
    }
  };

  // 更新模板
  const updateTemplate = async (templateId, data) => {
    try {
      const response = await axios.put(`/api/projects/${projectId}/questions/templates/${templateId}`, data);
      if (response.data.success) {
        toast.success(t('questions.updateTemplateSuccess'));
        fetchTemplates();
        return response.data.template;
      }
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error(t('questions.updateTemplateFailed'));
      throw error;
    }
  };

  // 刪除模板
  const deleteTemplate = async templateId => {
    try {
      const response = await axios.delete(`/api/projects/${projectId}/questions/templates/${templateId}`);
      if (response.data.success) {
        toast.success(t('questions.deleteTemplateSuccess'));
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error(t('questions.deleteTemplateFailed'));
      throw error;
    }
  };

  // 初始載入
  useEffect(() => {
    if (projectId) {
      fetchTemplates();
    }
  }, [projectId, sourceType]);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    refetch: fetchTemplates
  };
}
