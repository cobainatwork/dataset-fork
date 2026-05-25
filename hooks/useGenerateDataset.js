import { useCallback } from 'react';
import { toast } from 'sonner';
import i18n from '@/lib/i18n';
import axios from 'axios';
import { useAtomValue } from 'jotai/index';
import { selectedModelInfoAtom } from '@/lib/store';
import { useTranslation } from 'react-i18next';

export function useGenerateDataset() {
  const model = useAtomValue(selectedModelInfoAtom);
  const { t } = useTranslation();

  const generateSingleDataset = useCallback(
    async ({ projectId, questionId, questionInfo, imageId, imageName }) => {
      // 獲取模型引數
      if (!model) {
        toast.error(t('models.configNotFound'));
        return null;
      }

      // 判斷是否為圖片問題
      const isImageQuestion = !!imageId;

      // 呼叫API生成資料集
      const currentLanguage = i18n.language;

      if (isImageQuestion) {
        // 圖片問題：呼叫圖片資料集生成介面
        toast.promise(
          axios.post(`/api/projects/${projectId}/images/datasets`, {
            imageName,
            question: { question: questionInfo, id: questionId },
            model,
            language: currentLanguage
          }),
          {
            loading: t('datasets.generating'),
            description: `圖片：【${imageName}】\n問題：【${questionInfo}】`,
            position: 'top-right',
            success: data => {
              return '生成資料整合功';
            },
            error: error => {
              return t('datasets.generateFailed', { error: error.response?.data?.error });
            }
          }
        );
      } else {
        // 文字問題：呼叫普通資料集生成介面
        toast.promise(
          axios.post(`/api/projects/${projectId}/datasets`, {
            questionId,
            model,
            language: currentLanguage
          }),
          {
            loading: t('datasets.generating'),
            description: `問題：【${questionInfo}】`,
            position: 'top-right',
            success: data => {
              return '生成資料整合功';
            },
            error: error => {
              return t('datasets.generateFailed', { error: error.response?.data?.error });
            }
          }
        );
      }
    },
    [model, t]
  );

  const generateMultipleDataset = useCallback(
    async (projectId, questions) => {
      let completed = 0;
      const total = questions.length;
      // 顯示帶進度的Loading
      const loadingToastId = toast.loading(`正在處理請求 (${completed}/${total})...`, { position: 'top-right' });

      // 處理每個請求
      const processRequest = async question => {
        try {
          const isImageQuestion = !!question.imageId;
          let response;

          if (isImageQuestion) {
            // 圖片問題
            response = await axios.post(`/api/projects/${projectId}/images/datasets`, {
              imageName: question.imageName,
              question,
              model,
              language: i18n.language
            });
          } else {
            // 文字問題
            response = await axios.post(`/api/projects/${projectId}/datasets`, {
              questionId: question.id,
              model,
              language: i18n.language
            });
          }

          const data = response.data;
          completed++;
          toast.success(`${question.question} 完成`, { position: 'top-right' });
          toast.loading(`正在處理請求 (${completed}/${total})...`, { id: loadingToastId });
          return data;
        } catch (error) {
          completed++;
          toast.error(`${question.question} 失敗`, {
            description: error.message,
            position: 'top-right'
          });
          toast.loading(`正在處理請求 (${completed}/${total})...`, { id: loadingToastId });
          throw error;
        }
      };

      try {
        const results = await Promise.allSettled(questions.map(req => processRequest(req)));
        // 全部完成後更新Loading為完成狀態
        toast.success(`全部請求處理完成 (成功: ${results.filter(r => r.status === 'fulfilled').length}/${total})`, {
          id: loadingToastId,
          position: 'top-right'
        });
        return results;
      } catch {
        // Promise.allSettled不會進入catch，這裡只是保險
      }
    },
    [model, t]
  );

  return { generateSingleDataset, generateMultipleDataset };
}
