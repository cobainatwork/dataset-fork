/**
 * 問題模版服務
 * 處理基於模版為資料來源批次生成問題的邏輯
 */

import { PrismaClient } from '@prisma/client';
import { getChunks } from '@/lib/db/chunks';
import { getImages, getImageChunk } from '@/lib/db/images';
import { saveQuestions } from '@/lib/db/questions';

const prisma = new PrismaClient();

/**
 * 根據問題模版為所有相關資料來源建立問題
 * @param {String} projectId 專案ID
 * @param {Object} template 問題模版物件
 * @returns {Promise<Object>} 生成結果統計
 */
export async function generateQuestionsFromTemplate(projectId, template) {
  const { sourceType } = template;

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  try {
    if (sourceType === 'text') {
      // 為所有文字塊生成問題
      const result = await generateQuestionsForTextChunks(projectId, template);
      successCount += result.successCount;
      failCount += result.failCount;
      errors.push(...result.errors);
    } else if (sourceType === 'image') {
      // 為所有圖片生成問題
      const result = await generateQuestionsForImages(projectId, template);
      successCount += result.successCount;
      failCount += result.failCount;
      errors.push(...result.errors);
    }

    return {
      success: true,
      successCount,
      failCount,
      errors,
      message: `成功為 ${successCount} 個數據源建立問題，${failCount} 個失敗`
    };
  } catch (error) {
    console.error('生成問題失敗:', error);
    return {
      success: false,
      successCount,
      failCount,
      errors: [...errors, error.message],
      message: '生成問題過程中發生錯誤'
    };
  }
}

/**
 * 為所有文字塊生成問題
 * @param {String} projectId 專案ID
 * @param {Object} template 問題模版
 * @param {Boolean} onlyNew 是否只為新的資料來源建立（編輯模式）
 * @returns {Promise<Object>} 生成結果
 */
async function generateQuestionsForTextChunks(projectId, template, onlyNew = false) {
  let successCount = 0;
  let failCount = 0;
  const errors = [];

  try {
    // 獲取專案下所有文字塊
    const chunks = await prisma.chunks.findMany({
      where: { projectId },
      select: {
        id: true
      }
    });

    let targetChunks = chunks;

    // 編輯模式：只為還未建立此模板問題的文字塊建立
    if (onlyNew && template.id) {
      targetChunks = [];
      for (const chunk of chunks) {
        const existingQuestion = await prisma.questions.findFirst({
          where: {
            projectId,
            chunkId: chunk.id,
            templateId: template.id
          }
        });
        if (!existingQuestion) {
          targetChunks.push(chunk);
        }
      }
    }

    // 為每個文字塊建立問題
    if (targetChunks.length > 0) {
      await saveQuestions(
        projectId,
        targetChunks.map(chunk => ({
          question: template.question,
          chunkId: chunk.id,
          templateId: template.id,
          label: ''
        }))
      );
      successCount = targetChunks.length;
    }

    return { successCount, failCount, errors };
  } catch (error) {
    console.error('獲取文字塊失敗:', error);
    return {
      successCount,
      failCount,
      errors: [...errors, `獲取文字塊失敗: ${error.message}`]
    };
  }
}

/**
 * 為所有圖片生成問題
 * @param {String} projectId 專案ID
 * @param {Object} template 問題模版
 * @param {Boolean} onlyNew 是否只為新的資料來源建立（編輯模式）
 * @returns {Promise<Object>} 生成結果
 */
async function generateQuestionsForImages(projectId, template, onlyNew = false) {
  let successCount = 0;
  let failCount = 0;
  const errors = [];

  try {
    // 獲取專案下所有圖片
    const images = await prisma.images.findMany({
      where: { projectId },
      select: {
        id: true,
        imageName: true
      }
    });

    const chunk = await getImageChunk(projectId);

    // 為每個圖片建立問題
    for (const image of images) {
      try {
        // 編輯模式：檢查是否已經建立過此模板的問題
        if (onlyNew && template.id) {
          const existingQuestion = await prisma.questions.findFirst({
            where: {
              projectId,
              imageId: image.id,
              templateId: template.id
            }
          });
          if (existingQuestion) {
            continue; // 跳過已存在的
          }
        }

        // 建立圖片問題，使用imageId而不是chunkId
        await prisma.questions.create({
          data: {
            projectId,
            question: template.question,
            imageId: image.id,
            imageName: image.imageName,
            templateId: template.id,
            label: 'image',
            chunkId: chunk.id
          }
        });
        successCount++;
      } catch (error) {
        console.error(`為圖片 ${image.id} 建立問題失敗:`, error);
        failCount++;
        errors.push(`圖片 ${image.imageName || image.id}: ${error.message}`);
      }
    }

    return { successCount, failCount, errors };
  } catch (error) {
    console.error('獲取圖片失敗:', error);
    return {
      successCount,
      failCount,
      errors: [...errors, `獲取圖片失敗: ${error.message}`]
    };
  }
}

/**
 * 編輯模式：為還未建立此模板問題的資料來源生成問題
 * @param {String} projectId 專案ID
 * @param {Object} template 問題模版物件
 * @returns {Promise<Object>} 生成結果統計
 */
export async function generateQuestionsFromTemplateEdit(projectId, template) {
  const { sourceType } = template;

  let successCount = 0;
  let failCount = 0;
  const errors = [];

  try {
    if (sourceType === 'text') {
      const result = await generateQuestionsForTextChunks(projectId, template, true);
      successCount += result.successCount;
      failCount += result.failCount;
      errors.push(...result.errors);
    } else if (sourceType === 'image') {
      const result = await generateQuestionsForImages(projectId, template, true);
      successCount += result.successCount;
      failCount += result.failCount;
      errors.push(...result.errors);
    }

    return {
      success: true,
      successCount,
      failCount,
      errors,
      message: `成功為 ${successCount} 個數據源建立問題，${failCount} 個失敗`
    };
  } catch (error) {
    console.error('生成問題失敗:', error);
    return {
      success: false,
      successCount,
      failCount,
      errors: [...errors, error.message],
      message: '生成問題過程中發生錯誤'
    };
  }
}

/**
 * 檢查模版是否可以生成問題
 * @param {String} projectId 專案ID
 * @param {String} sourceType 資料來源型別
 * @returns {Promise<Object>} 檢查結果
 */
export async function checkTemplateGenerationAvailability(projectId, sourceType) {
  try {
    let count = 0;

    if (sourceType === 'text') {
      const chunks = await getChunks(projectId, 1, 1);
      count = chunks.total || 0;
    } else if (sourceType === 'image') {
      const images = await getImages(projectId, 1, 1);
      count = images.total || 0;
    }

    return {
      available: count > 0,
      count,
      message:
        count > 0
          ? `找到 ${count} 個${sourceType === 'text' ? '文字塊' : '圖片'}，可以生成問題`
          : `專案中沒有${sourceType === 'text' ? '文字塊' : '圖片'}，無法生成問題`
    };
  } catch (error) {
    console.error('檢查資料來源可用性失敗:', error);
    return {
      available: false,
      count: 0,
      message: '檢查資料來源時發生錯誤'
    };
  }
}

export default {
  generateQuestionsFromTemplate,
  generateQuestionsFromTemplateEdit,
  checkTemplateGenerationAvailability
};
