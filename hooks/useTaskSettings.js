import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_SETTINGS } from '@/constant/setting';

export default function useTaskSettings(projectId) {
  const { t } = useTranslation();
  const [taskSettings, setTaskSettings] = useState({
    ...DEFAULT_SETTINGS
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchTaskSettings() {
      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/tasks`);
        if (!response.ok) {
          throw new Error(t('settings.fetchTasksFailed'));
        }

        const data = await response.json();

        // 如果沒有配置，使用預設值
        if (Object.keys(data).length === 0) {
          setTaskSettings({
            ...DEFAULT_SETTINGS
          });
        } else {
          // 確保所有預設值都被正確設定，特別是數字型別的欄位
          const mergedSettings = {
            ...DEFAULT_SETTINGS,
            ...data
          };

          // 確保 multiTurnRounds 是數字型別
          if (mergedSettings.multiTurnRounds !== undefined) {
            mergedSettings.multiTurnRounds = Number(mergedSettings.multiTurnRounds);
          }

          setTaskSettings(mergedSettings);
        }
      } catch (error) {
        console.error('獲取任務配置出錯:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTaskSettings();
  }, [projectId, t]);

  return {
    taskSettings,
    setTaskSettings,
    loading,
    error,
    success,
    setSuccess
  };
}
