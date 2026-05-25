import { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// 深度遍歷 JSON，將所有值設為空字串
function clearJsonValues(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => clearJsonValues(item));
  } else if (obj !== null && typeof obj === 'object') {
    const cleared = {};
    for (const key in obj) {
      cleared[key] = clearJsonValues(obj[key]);
    }
    return cleared;
  } else {
    return ''; // 所有基礎型別值都變為空字串
  }
}

export function useAnnotation(projectId, onSuccess, onFindNextImage) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [answer, setAnswer] = useState('');

  // 開啟標註對話方塊
  const openAnnotation = async (image, template = null) => {
    setLoading(true);
    try {
      // 獲取圖片詳情，包括已標註和未標註的問題
      const response = await axios.get(`/api/projects/${projectId}/images/${image.id}`);
      if (response.data.success) {
        const imageDetail = response.data.data;
        setCurrentImage(imageDetail);

        // 如果沒有指定模板，嘗試選擇第一個未標註的問題
        if (!template) {
          if (imageDetail.unansweredQuestions?.length > 0) {
            template = imageDetail.unansweredQuestions[0];
          }
        }

        setSelectedTemplate(template);

        // 根據問題型別初始化答案
        let initialAnswer = '';
        if (template?.answerType === 'label') {
          initialAnswer = [];
        } else if (template?.answerType === 'custom_format' && template?.customFormat) {
          // 為自定義格式提供預設值（所有欄位值清空）
          try {
            let templateJson;
            if (typeof template.customFormat === 'string') {
              // 如果customFormat是字串，嘗試解析為JSON
              templateJson = JSON.parse(template.customFormat);
            } else {
              // 如果customFormat已經是物件，直接使用
              templateJson = template.customFormat;
            }
            // 深度遍歷，將所有欄位值清空
            const clearedJson = clearJsonValues(templateJson);
            initialAnswer = JSON.stringify(clearedJson, null, 2);
          } catch (error) {
            // 如枟解析失敗，提供一個空的JSON物件
            initialAnswer = '{}';
          }
        }

        setAnswer(initialAnswer);
        setOpen(true);
      } else {
        toast.error(t('images.loadImageDetailFailed', { defaultValue: '載入圖片詳情失敗' }));
      }
    } catch (error) {
      console.error('獲取圖片詳情失敗:', error);
      toast.error(t('images.loadImageDetailFailed', { defaultValue: '載入圖片詳情失敗' }));
    } finally {
      setLoading(false);
    }
  };

  // 關閉對話方塊
  const closeAnnotation = () => {
    setOpen(false);
    setCurrentImage(null);
    setSelectedTemplate(null);
    setAnswer('');
  };

  // 重新整理當前圖片的問題列表（建立問題後呼叫）
  const refreshCurrentImage = async () => {
    if (!currentImage) return;

    try {
      const response = await axios.get(`/api/projects/${projectId}/images/${currentImage.id}`);
      if (response.data.success) {
        const imageDetail = response.data.data;
        // 更新當前圖片資料
        setCurrentImage(imageDetail);
        return imageDetail;
      }
    } catch (error) {
      console.error('重新整理圖片詳情失敗:', error);
    }
  };

  // 查詢下一個未標註的問題
  const findNextUnansweredQuestion = async () => {
    // 重新獲取圖片詳情，獲取最新的問題列表
    try {
      const response = await axios.get(`/api/projects/${projectId}/images/${currentImage.id}`);
      if (response.data.success) {
        const imageDetail = response.data.data;

        // 更新當前圖片資料
        setCurrentImage(imageDetail);

        // 返回第一個未標註的問題
        if (imageDetail.unansweredQuestions?.length > 0) {
          return imageDetail.unansweredQuestions[0];
        }

        return null;
      }
    } catch (error) {
      console.error('獲取下一個問題失敗:', error);
      return null;
    }
  };

  // 儲存標註
  const saveAnnotation = async (continueNext = false) => {
    if (!currentImage) {
      toast.error(t('images.noImageSelected', { defaultValue: '未選擇圖片' }));
      return;
    }

    if (!selectedTemplate) {
      toast.error(t('images.noTemplateSelected', { defaultValue: '請選擇問題' }));
      return;
    }

    // 驗證答案
    if (!answer || (Array.isArray(answer) && answer.length === 0)) {
      toast.error(t('images.answerRequired', { defaultValue: '請輸入答案' }));
      return;
    }

    // 如果是自定義格式，驗證 JSON 格式
    if (selectedTemplate.answerType === 'custom_format') {
      try {
        JSON.parse(answer);
      } catch (e) {
        toast.error(t('images.invalidJsonFormat', { defaultValue: 'JSON 格式不正確' }));
        return;
      }
    }

    console.log(999, answer);
    setSaving(true);
    try {
      const response = await axios.post(`/api/projects/${projectId}/images/annotations`, {
        imageId: currentImage.id,
        imageName: currentImage.imageName,
        questionId: selectedTemplate.id,
        question: selectedTemplate.question,
        templateId: selectedTemplate.id,
        answerType: selectedTemplate.answerType,
        answer
      });

      if (response.data.success) {
        toast.success(t('images.annotationSuccess', { defaultValue: '標註儲存成功' }));

        // 觸發重新整理回撥
        if (onSuccess) {
          onSuccess();
        }

        if (continueNext) {
          // 查詢下一個未標註的問題
          const nextQuestion = await findNextUnansweredQuestion();

          if (nextQuestion) {
            // 切換到下一個問題
            setSelectedTemplate(nextQuestion);

            // 根據問題型別初始化答案
            let initialAnswer = '';
            if (nextQuestion.answerType === 'label') {
              initialAnswer = [];
            } else if (nextQuestion.answerType === 'custom_format' && nextQuestion.customFormat) {
              try {
                let templateJson;
                if (typeof nextQuestion.customFormat === 'string') {
                  templateJson = JSON.parse(nextQuestion.customFormat);
                } else {
                  templateJson = nextQuestion.customFormat;
                }
                const clearedJson = clearJsonValues(templateJson);
                initialAnswer = JSON.stringify(clearedJson, null, 2);
              } catch (error) {
                initialAnswer = '{}';
              }
            }
            setAnswer(initialAnswer);
          } else {
            // 沒有更多未標註的問題了，嘗試查詢下一個有未標註問題的圖片
            if (onFindNextImage) {
              const nextImage = await onFindNextImage();
              if (nextImage) {
                // 開啟下一個圖片的標註
                await openAnnotation(nextImage);
              } else {
                // 沒有更多圖片了
                toast.info(t('images.allImagesAnnotated', { defaultValue: '所有圖片的問題都已標註完成' }));
                closeAnnotation();
              }
            } else {
              toast.info(t('images.allQuestionsAnnotated', { defaultValue: '當前圖片所有問題已標註完成' }));
              closeAnnotation();
            }
          }
        } else {
          closeAnnotation();
        }
      }
    } catch (error) {
      console.error('儲存標註失敗:', error);
      const errorMsg = error.response?.data?.error || t('images.annotationFailed', { defaultValue: '儲存標註失敗' });
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // 處理模板變更
  const handleTemplateChange = template => {
    setSelectedTemplate(template);

    // 根據新模板型別初始化答案
    let initialAnswer = '';
    if (template?.answerType === 'label') {
      initialAnswer = [];
    } else if (template?.answerType === 'custom_format' && template?.customFormat) {
      // 為自定義格式提供預設值（所有欄位值清空）
      try {
        let templateJson;
        if (typeof template.customFormat === 'string') {
          // 如果customFormat是字串，嘗試解析為JSON
          templateJson = JSON.parse(template.customFormat);
        } else {
          // 如果customFormat已經是物件，直接使用
          templateJson = template.customFormat;
        }
        // 深度遍歷，將所有欄位值清空
        const clearedJson = clearJsonValues(templateJson);
        initialAnswer = JSON.stringify(clearedJson, null, 2);
      } catch (error) {
        // 如枟解析失敗，提供一個空的JSON物件
        initialAnswer = '{}';
      }
    }

    setAnswer(initialAnswer);
  };

  return {
    open,
    saving,
    loading,
    currentImage,
    selectedTemplate,
    answer,
    setSelectedTemplate,
    setAnswer,
    handleTemplateChange,
    openAnnotation,
    closeAnnotation,
    saveAnnotation,
    refreshCurrentImage
  };
}
