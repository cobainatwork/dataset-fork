'use server';
import { db } from '@/lib/db/index';

/**
 * 建立評估結果
 * @param {Object} data - 評估結果資料
 * @returns {Promise<Object>} - 建立的評估結果
 */
export async function createEvalResult(data) {
  try {
    return await db.evalResults.create({ data });
  } catch (error) {
    console.error('Failed to create eval result:', error);
    throw error;
  }
}

/**
 * 批次建立評估結果
 * @param {Array} dataArray - 評估結果資料陣列
 * @returns {Promise<Object>} - 建立結果
 */
export async function createManyEvalResults(dataArray) {
  try {
    return await db.evalResults.createMany({ data: dataArray });
  } catch (error) {
    console.error('Failed to create many eval results:', error);
    throw error;
  }
}

/**
 * 獲取任務的所有評估結果（支援分頁和篩選）
 * @param {string} taskId - 任務ID
 * @param {Object} options - 查詢選項 { page, pageSize, type, isCorrect }
 * @returns {Promise<Object>} - { items: [], total: 0 }
 */
export async function getEvalResultsByTaskId(taskId, { page = 1, pageSize = 10, type = null, isCorrect = null } = {}) {
  try {
    const where = { taskId };

    // 如果指定了題型，新增到查詢條件
    if (type) {
      where.evalDataset = {
        questionType: type
      };
    }

    // 如果指定了正確性篩選
    if (isCorrect !== null) {
      where.isCorrect = isCorrect;
    }

    const [items, total] = await Promise.all([
      db.evalResults.findMany({
        where,
        include: {
          evalDataset: {
            select: {
              id: true,
              question: true,
              questionType: true,
              options: true,
              correctAnswer: true,
              tags: true
            }
          }
        },
        orderBy: { createAt: 'asc' }, // 按建立時間正序，即題目順序
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.evalResults.count({ where })
    ]);

    return { items, total };
  } catch (error) {
    console.error('Failed to get eval results by task ID:', error);
    throw error;
  }
}

/**
 * 獲取專案的所有評估結果
 * @param {string} projectId - 專案ID
 * @returns {Promise<Array>} - 評估結果陣列
 */
export async function getEvalResultsByProjectId(projectId) {
  try {
    return await db.evalResults.findMany({
      where: { projectId },
      include: {
        evalDataset: {
          select: {
            id: true,
            question: true,
            questionType: true,
            correctAnswer: true
          }
        }
      },
      orderBy: { createAt: 'desc' }
    });
  } catch (error) {
    console.error('Failed to get eval results by project ID:', error);
    throw error;
  }
}

/**
 * 更新評估結果
 * @param {string} id - 評估結果ID
 * @param {Object} data - 更新資料
 * @returns {Promise<Object>} - 更新後的評估結果
 */
export async function updateEvalResult(id, data) {
  try {
    return await db.evalResults.update({
      where: { id },
      data
    });
  } catch (error) {
    console.error('Failed to update eval result:', error);
    throw error;
  }
}

/**
 * 批次更新評估結果（透過 taskId）
 * @param {string} taskId - 任務ID
 * @param {Object} data - 更新資料
 * @returns {Promise<Object>} - 更新結果
 */
export async function updateEvalResultsByTaskId(taskId, data) {
  try {
    return await db.evalResults.updateMany({
      where: { taskId },
      data
    });
  } catch (error) {
    console.error('Failed to update eval results by task ID:', error);
    throw error;
  }
}

/**
 * 刪除任務的所有評估結果
 * @param {string} taskId - 任務ID
 * @returns {Promise<Object>} - 刪除結果
 */
export async function deleteEvalResultsByTaskId(taskId) {
  try {
    return await db.evalResults.deleteMany({
      where: { taskId }
    });
  } catch (error) {
    console.error('Failed to delete eval results by task ID:', error);
    throw error;
  }
}

/**
 * 獲取任務評估統計
 * @param {string} taskId - 任務ID
 * @returns {Promise<Object>} - 統計資料
 */
export async function getEvalResultsStats(taskId) {
  try {
    const results = await db.evalResults.findMany({
      where: { taskId },
      select: {
        score: true,
        isCorrect: true,
        evalDataset: {
          select: {
            questionType: true
          }
        }
      }
    });

    const totalQuestions = results.length;
    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const correctCount = results.filter(r => r.isCorrect).length;

    // 按題型統計
    const byType = {};
    results.forEach(r => {
      const type = r.evalDataset.questionType;
      if (!byType[type]) {
        byType[type] = { total: 0, score: 0, correct: 0 };
      }
      byType[type].total++;
      byType[type].score += r.score;
      if (r.isCorrect) byType[type].correct++;
    });

    return {
      totalQuestions,
      totalScore,
      correctCount,
      scorePercentage: totalQuestions > 0 ? (totalScore / totalQuestions) * 100 : 0,
      accuracyPercentage: totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0,
      byType
    };
  } catch (error) {
    console.error('Failed to get eval results stats:', error);
    throw error;
  }
}

/**
 * 檢查評估結果是否存在
 * @param {string} taskId - 任務ID
 * @param {string} evalDatasetId - 評估題目ID
 * @returns {Promise<Object|null>} - 評估結果或 null
 */
export async function getEvalResult(taskId, evalDatasetId) {
  try {
    return await db.evalResults.findUnique({
      where: {
        taskId_evalDatasetId: {
          taskId,
          evalDatasetId
        }
      }
    });
  } catch (error) {
    console.error('Failed to get eval result:', error);
    throw error;
  }
}

/**
 * 建立或更新評估結果（upsert）
 * @param {string} taskId - 任務ID
 * @param {string} evalDatasetId - 評估題目ID
 * @param {Object} data - 評估結果資料
 * @returns {Promise<Object>} - 評估結果
 */
export async function upsertEvalResult(taskId, evalDatasetId, data) {
  try {
    return await db.evalResults.upsert({
      where: {
        taskId_evalDatasetId: {
          taskId,
          evalDatasetId
        }
      },
      update: data,
      create: {
        ...data,
        taskId,
        evalDatasetId
      }
    });
  } catch (error) {
    console.error('Failed to upsert eval result:', error);
    throw error;
  }
}
