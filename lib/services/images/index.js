/**
 * 圖片問題和答案生成服務
 */

import LLMClient from '@/lib/llm/core/index';
import { getImageQuestionPrompt } from '@/lib/llm/prompts/imageQuestion';
import { getImageAnswerPrompt } from '@/lib/llm/prompts/imageAnswer';
import { extractJsonFromLLMOutput, safeParseJSON } from '@/lib/llm/common/util';
import { getImageById, getImageChunk, createImages } from '@/lib/db/images';
import { saveQuestions, updateQuestionAnsweredStatus, getQuestionTemplateById } from '@/lib/db/questions';
import { createImageDataset } from '@/lib/db/imageDatasets';
import { getProjectPath } from '@/lib/db/base';
import { getMimeType } from '@/lib/util/image';
import path from 'path';
import fs from 'fs/promises';
import sizeOf from 'image-size';
import logger from '@/lib/util/logger';

/**
 * 為指定圖片生成問題
 * @param {String} projectId 專案ID
 * @param {String} imageId 圖片ID
 * @param {Object} options 選項
 * @param {Object} options.model 模型配置
 * @param {String} options.language 語言(zh/en)
 * @param {Number} options.count 問題數量(預設3)
 * @returns {Promise<Object>} 生成結果
 */
export async function generateQuestionsForImage(projectId, imageId, options) {
  try {
    const { model, language = 'zh', count = 3 } = options;

    if (!model) {
      throw new Error('模型配置不能為空');
    }

    // 獲取圖片資訊
    const image = await getImageById(imageId);
    if (!image) {
      throw new Error('圖片不存在');
    }

    if (image.projectId !== projectId) {
      throw new Error('圖片不屬於指定專案');
    }

    // 讀取圖片檔案
    const projectPath = await getProjectPath(projectId);
    const imagePath = path.join(projectPath, 'images', image.imageName);
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = getMimeType(image.imageName);

    // 建立 LLM 客戶端
    const llmClient = new LLMClient(model);

    // 生成問題提示詞
    const prompt = await getImageQuestionPrompt(language, { number: count }, projectId);

    // 呼叫視覺模型生成問題
    const { answer } = await llmClient.getVisionResponse(prompt, base64Image, mimeType);

    // 提取問題列表
    const questions = extractJsonFromLLMOutput(answer);

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error('生成問題失敗或問題列表為空');
    }

    // 獲取或建立圖片專用的虛擬 chunk
    const imageChunk = await getImageChunk(projectId);

    // 儲存問題到資料庫
    const savedQuestions = await saveQuestions(
      projectId,
      questions.map(q => ({
        question: q,
        label: 'image',
        imageId: image.id,
        imageName: image.imageName,
        chunkId: imageChunk.id
      }))
    );

    logger.info(`圖片 ${image.imageName} 生成了 ${questions.length} 個問題`);

    return {
      imageId: image.id,
      imageName: image.imageName,
      questions: questions,
      total: questions.length
    };
  } catch (error) {
    logger.error(`為圖片 ${imageId} 生成問題時出錯:`, error);
    throw error;
  }
}

/**
 * 為指定圖片生成資料集（問答對）
 * @param {String} projectId 專案ID
 * @param {String} imageId 圖片ID
 * @param {String} question 問題文字
 * @param {Object} options 選項
 * @param {Object} options.model 模型配置
 * @returns {Promise<Object>} 生成結果
 */
export async function generateDatasetForImage(projectId, imageId, question, options) {
  try {
    const { model, language = 'zh', previewOnly = false } = options;

    if (!model) {
      throw new Error('模型配置不能為空');
    }

    // 獲取圖片資訊
    const image = await getImageById(imageId);
    if (!image) {
      throw new Error('圖片不存在');
    }

    if (image.projectId !== projectId) {
      throw new Error('圖片不屬於指定專案');
    }

    // 讀取圖片檔案
    const projectPath = await getProjectPath(projectId);
    const imagePath = path.join(projectPath, 'images', image.imageName);
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = getMimeType(image.imageName);

    // 獲取問題模版
    const llmClient = new LLMClient(model);
    const { id, question: questionText } = question;
    let questionTemplate = { answerType: 'text' };
    if (id) {
      questionTemplate = (await getQuestionTemplateById(question.id)) || { answerType: 'text' };
    }
    const prompt = await getImageAnswerPrompt(language, { question: questionText, questionTemplate }, projectId);
    let { answer } = await llmClient.getVisionResponse(prompt, base64Image, mimeType);
    if (questionTemplate.answerType !== 'text') {
      const answerJson = safeParseJSON(answer);
      if (typeof answerJson !== 'string') {
        answer = JSON.stringify(answerJson, null, 2);
      }
    }
    // 如果是預覽模式，只返回答案，不儲存資料集
    if (previewOnly) {
      return {
        imageId: image.id,
        imageName: image.imageName,
        question: questionText,
        answer: answer,
        dataset: null
      };
    }

    // 儲存圖片資料集
    const dataset = await createImageDataset(projectId, {
      imageId: image.id,
      imageName: image.imageName,
      question: questionText,
      questionId: id,
      answer: answer,
      model: model.modelId || model.modelName,
      answerType: questionTemplate.answerType
    });

    // 更新對應問題的 answered 狀態為 true
    await updateQuestionAnsweredStatus(projectId, image.id, questionText, true);

    logger.info(`圖片 ${image.imageName} 的問題 "${questionText}" 已生成資料集`);

    return {
      imageId: image.id,
      imageName: image.imageName,
      question: questionText,
      answer: answer,
      dataset: dataset
    };
  } catch (error) {
    logger.error(`為圖片 ${imageId} 生成資料集時出錯:`, error);
    throw error;
  }
}

/**
 * 匯入圖片到專案
 * @param {String} projectId 專案ID
 * @param {Array<String>} directories 目錄路徑陣列
 * @returns {Promise<Object>} 匯入結果 { success: true, count: number, images: Array }
 */
export async function importImagesFromDirectories(projectId, directories) {
  try {
    if (!directories || !Array.isArray(directories) || directories.length === 0) {
      throw new Error('請選擇至少一個目錄');
    }

    // 專案圖片目錄
    const projectPath = await getProjectPath(projectId);
    const projectImagesDir = path.join(projectPath, 'images');
    await fs.mkdir(projectImagesDir, { recursive: true });

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const importedImages = [];

    // 遍歷所有選擇的目錄
    for (const directory of directories) {
      try {
        const files = await fs.readdir(directory);

        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (!imageExtensions.includes(ext)) continue;

          const sourcePath = path.join(directory, file);
          const destPath = path.join(projectImagesDir, file);

          // 複製檔案（覆蓋同名檔案）
          await fs.copyFile(sourcePath, destPath);

          // 獲取圖片資訊
          const stats = await fs.stat(destPath);
          let dimensions = { width: null, height: null };

          try {
            // 讀取檔案為 Buffer，然後傳遞給 sizeOf
            const imageBuffer = await fs.readFile(destPath);
            const size = sizeOf(imageBuffer);
            if (size && size.width && size.height) {
              dimensions = { width: size.width, height: size.height };
            }
          } catch (err) {
            console.warn(`無法獲取圖片尺寸: ${file}`, err.message);
          }

          importedImages.push({
            imageName: file,
            path: `${projectPath}/images/${file}`,
            size: stats.size,
            width: dimensions.width,
            height: dimensions.height
          });
        }
      } catch (err) {
        console.error(`處理目錄失敗: ${directory}`, err);
      }
    }

    // 批次儲存到資料庫
    const savedImages = await createImages(projectId, importedImages);

    logger.info(`專案 ${projectId} 成功匯入 ${savedImages.length} 張圖片`);

    return {
      success: true,
      count: savedImages.length,
      images: savedImages
    };
  } catch (error) {
    logger.error(`匯入圖片到專案 ${projectId} 時出錯:`, error);
    throw error;
  }
}

/**
 * 獲取圖片詳情（包含問題列表和已標註資料）
 * @param {String} projectId 專案ID
 * @param {String} imageId 圖片ID
 * @returns {Promise<Object>} 圖片詳情
 */
export async function getImageDetailWithQuestions(projectId, imageId) {
  try {
    const { db } = await import('@/lib/db/index');

    if (!imageId) {
      throw new Error('缺少圖片ID');
    }

    // 獲取圖片基本資訊
    const image = await getImageById(imageId);
    if (!image) {
      throw new Error('圖片不存在');
    }

    if (image.projectId !== projectId) {
      throw new Error('圖片不屬於指定專案');
    }

    // 讀取圖片檔案並轉換為base64
    let base64Image = null;
    try {
      const projectPath = await getProjectPath(projectId);
      const imagePath = path.join(projectPath, 'images', image.imageName);
      const imageBuffer = await fs.readFile(imagePath);
      const mimeType = getMimeType(image.imageName);
      base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (err) {
      console.warn(`Failed to read image: ${image.imageName}`, err);
    }

    // 獲取圖片的所有問題
    const questions = await db.questions.findMany({
      where: {
        projectId,
        imageId: image.id
      },
      orderBy: {
        createAt: 'desc'
      }
    });

    // 獲取所有關聯的問題模板
    const templateIds = questions.map(q => q.templateId).filter(Boolean);

    const templates =
      templateIds.length > 0
        ? await db.questionTemplates.findMany({
            where: {
              id: { in: templateIds }
            }
          })
        : [];

    const templateMap = new Map(templates.map(t => [t.id, t]));

    // 獲取每個問題的已標註答案
    const questionsWithAnswers = await Promise.all(
      questions.map(async question => {
        // 查詢該問題的已標註答案
        const existingAnswer = await db.imageDatasets.findFirst({
          where: {
            imageId: image.id,
            question: question.question
          },
          orderBy: {
            createAt: 'desc'
          }
        });

        // 獲取關聯的模板
        const template = question.templateId ? templateMap.get(question.templateId) : null;

        return {
          ...question,
          template,
          hasAnswer: !!existingAnswer,
          answer: existingAnswer?.answer || null,
          answerId: existingAnswer?.id || null
        };
      })
    );

    // 分離已標註和未標註的問題
    const answeredQuestions = questionsWithAnswers
      .filter(q => q.hasAnswer)
      .map(q => ({
        id: q.id,
        question: q.question,
        answerType: q.template?.answerType || 'text',
        labels: q.template?.labels || '',
        customFormat: q.template?.customFormat || '',
        description: q.template?.description || '',
        answer: q.answer,
        answerId: q.answerId,
        templateId: q.templateId
      }));

    const unansweredQuestions = questionsWithAnswers
      .filter(q => !q.hasAnswer)
      .map(q => ({
        id: q.id,
        question: q.question,
        answerType: q.template?.answerType || 'text',
        labels: q.template?.labels || '',
        customFormat: q.template?.customFormat || '',
        description: q.template?.description || '',
        templateId: q.templateId
      }));

    return {
      ...image,
      base64: base64Image,
      format: image.imageName.split('.').pop()?.toLowerCase(),
      answeredQuestions,
      unansweredQuestions,
      datasetCount: answeredQuestions.length,
      questionCount: questions.length
    };
  } catch (error) {
    logger.error(`獲取圖片 ${imageId} 詳情時出錯:`, error);
    throw error;
  }
}

export default {
  generateQuestionsForImage,
  importImagesFromDirectories,
  generateDatasetForImage,
  getImageDetailWithQuestions
};
