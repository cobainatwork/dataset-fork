/**
 * 圖片問題生成任務處理服務
 */

import { PrismaClient } from '@prisma/client';
import { processInParallel } from '@/lib/util/async';
import { updateTask } from './index';
import { getTaskConfig } from '@/lib/db/projects';
import imageService from '@/lib/services/images';

const prisma = new PrismaClient();

/**
 * 處理圖片問題生成任務
 * @param {object} task - 任務物件
 * @returns {Promise<void>}
 */
export async function processImageQuestionGenerationTask(task) {
  try {
    console.log(`Starting image question generation task: ${task.id}`);

    // 解析模型資訊
    let modelInfo;
    try {
      modelInfo = JSON.parse(task.modelInfo);
    } catch (error) {
      throw new Error(`Failed to parse model info: ${error.message}`);
    }

    // 解析任務備註，獲取問題數量配置
    let questionCount = 3; // 預設值
    if (task.note) {
      try {
        const noteData = JSON.parse(task.note);
        if (noteData.questionCount && noteData.questionCount >= 1 && noteData.questionCount <= 10) {
          questionCount = noteData.questionCount;
        }
      } catch (error) {
        console.warn('Failed to parse task note, using default question count:', error);
      }
    }

    console.log(`Each image will generate ${questionCount} questions`);

    // 獲取專案配置
    const taskConfig = await getTaskConfig(task.projectId);
    const concurrencyLimit = taskConfig?.concurrencyLimit || 2;

    // 1. 先查詢所有已有問題的圖片ID（一次查詢，高效）
    const imagesWithQuestions = await prisma.questions.findMany({
      where: {
        projectId: task.projectId,
        imageId: { not: null }
      },
      select: {
        imageId: true
      },
      distinct: ['imageId']
    });

    const imageIdsWithQuestions = new Set(imagesWithQuestions.map(q => q.imageId));

    // 2. 查詢所有圖片
    const allImages = await prisma.images.findMany({
      where: {
        projectId: task.projectId
      }
    });

    // 3. 過濾出沒有問題的圖片
    const imagesWithoutQuestions = allImages.filter(image => !imageIdsWithQuestions.has(image.id));

    if (imagesWithoutQuestions.length === 0) {
      console.log(`No images require question generation for project ${task.projectId}`);
      await updateTask(task.id, {
        status: 1,
        completedCount: 0,
        totalCount: 0,
        note: 'No images require question generation'
      });
      return;
    }

    // 更新任務總數
    const totalCount = imagesWithoutQuestions.length;
    await updateTask(task.id, {
      totalCount,
      detail: `Images to process: ${totalCount}`
    });

    // 3. 批次處理每個圖片
    let successCount = 0;
    let errorCount = 0;
    let totalQuestions = 0;
    let latestTaskStatus = 0;

    // 單個圖片處理函式
    const processImage = async image => {
      try {
        // 如果任務已經被標記為失敗或已中斷，不再繼續處理
        const latestTask = await prisma.task.findUnique({ where: { id: task.id } });
        if (latestTask.status === 2 || latestTask.status === 3) {
          latestTaskStatus = latestTask.status;
          return;
        }

        // 呼叫圖片問題生成服務
        const data = await imageService.generateQuestionsForImage(task.projectId, image.id, {
          model: modelInfo,
          language: task.language,
          count: questionCount // 使用任務配置的問題數量
        });

        // 增加成功計數
        successCount++;
        totalQuestions += data.total || 0;

        // 更新任務進度
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, questions generated: ${totalQuestions}`
        });

        return { success: true, imageId: image.id, imageName: image.imageName, total: data.total || 0 };
      } catch (error) {
        console.error(`Error processing image ${image.imageName}:`, error);
        errorCount++;

        // 更新任務進度
        await updateTask(task.id, {
          completedCount: successCount + errorCount,
          detail: `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, questions generated: ${totalQuestions}`
        });

        return { success: false, imageId: image.id, imageName: image.imageName, error: error.message };
      }
    };

    // 並行處理所有圖片，使用任務設定中的併發限制
    await processInParallel(imagesWithoutQuestions, processImage, concurrencyLimit, async (completed, total) => {
      console.log(`Image question generation progress: ${completed}/${total}`);
    });

    if (!latestTaskStatus) {
      // 任務完成，更新狀態
      const finalStatus = errorCount > 0 && successCount === 0 ? 2 : 1; // 如果全部失敗，標記為失敗；否則標記為完成
      const finalNote = `Processed: ${successCount + errorCount}/${totalCount}, succeeded: ${successCount}, failed: ${errorCount}, questions generated: ${totalQuestions}`;
      await updateTask(task.id, {
        status: finalStatus,
        completedCount: successCount + errorCount,
        detail: '',
        note: finalNote,
        endTime: new Date()
      });
    }

    console.log(`Image question generation task completed: ${task.id}`);
  } catch (error) {
    console.error(`Image question generation task failed: ${task.id}`, error);
    await updateTask(task.id, {
      status: 2,
      detail: `Processing failed: ${error.message}`,
      note: `Processing failed: ${error.message}`
    });
  }
}
