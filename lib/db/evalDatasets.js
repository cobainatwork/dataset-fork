import { db } from '@/lib/db/index';

/**
 * 建立單個測評題目
 * @param {Object} data - 題目資料
 * @returns {Promise<Object>} - 建立的題目
 */
export async function createEvalQuestion(data) {
  try {
    return await db.evalDatasets.create({ data });
  } catch (error) {
    console.error('Failed to create eval question:', error);
    throw error;
  }
}

/**
 * 批次建立測評題目
 * @param {Array} dataArray - 題目資料陣列
 * @returns {Promise<Object>} - 建立結果
 */
export async function createManyEvalQuestions(dataArray) {
  try {
    return await db.evalDatasets.createMany({ data: dataArray });
  } catch (error) {
    console.error('Failed to create many eval questions:', error);
    throw error;
  }
}

/**
 * 獲取專案的所有測評題目（簡單查詢）
 * @param {string} projectId - 專案ID
 * @returns {Promise<Array>} - 測評題目陣列
 */
export async function getEvalQuestions(projectId) {
  try {
    return await db.evalDatasets.findMany({
      where: { projectId },
      orderBy: { createAt: 'desc' }
    });
  } catch (error) {
    console.error('Failed to get eval questions from database:', error);
    throw error;
  }
}

/**
 * 分頁獲取專案的測評題目
 * @param {string} projectId - 專案ID
 * @param {Object} options - 查詢選項
 * @param {number} options.page - 頁碼
 * @param {number} options.pageSize - 每頁數量
 * @param {string} options.questionType - 題型篩選
 * @param {string} options.keyword - 關鍵詞搜尋
 * @param {string} options.chunkId - 文字塊ID篩選
 * @param {string|string[]} options.tags - 標籤篩選（支援多選）
 * @returns {Promise<Object>} - 分頁結果
 */
export function buildEvalQuestionWhere(projectId, { questionType, questionTypes, keyword, chunkId, tags } = {}) {
  const where = { projectId };

  const types =
    Array.isArray(questionTypes) && questionTypes.length > 0 ? questionTypes : questionType ? [questionType] : [];

  if (types.length === 1) {
    where.questionType = types[0];
  } else if (types.length > 1) {
    where.questionType = { in: types };
  }

  if (chunkId) {
    where.chunkId = chunkId;
  }

  if (tags) {
    if (Array.isArray(tags) && tags.length > 0) {
      where.OR = tags.map(tag => ({
        tags: {
          contains: tag
        }
      }));
    } else if (typeof tags === 'string' && tags.trim()) {
      const tagList = tags.split(',').filter(t => t.trim());
      if (tagList.length > 0) {
        where.OR = tagList.map(tag => ({
          tags: {
            contains: tag.trim()
          }
        }));
      }
    }
  }

  if (keyword) {
    where.question = {
      contains: keyword
    };
  }

  return where;
}

export async function getEvalQuestionsWithPagination(projectId, options = {}) {
  try {
    const { page = 1, pageSize = 20, questionType, questionTypes, keyword, chunkId, tags } = options;
    const skip = (page - 1) * pageSize;

    // 構建查詢條件
    const where = buildEvalQuestionWhere(projectId, { questionType, questionTypes, keyword, chunkId, tags });

    // 並行查詢資料和總數
    const [items, total] = await Promise.all([
      db.evalDatasets.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createAt: 'desc' },
        include: {
          chunks: {
            select: {
              id: true,
              name: true,
              fileName: true
            }
          }
        }
      }),
      db.evalDatasets.count({ where })
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    console.error('Failed to get eval questions with pagination:', error);
    throw error;
  }
}

/**
 * 獲取單個測評題目詳情
 * @param {string} id - 題目ID
 * @returns {Promise<Object>} - 題目詳情
 */
export async function getEvalQuestionById(id) {
  try {
    return await db.evalDatasets.findUnique({
      where: { id },
      include: {
        chunks: {
          select: {
            id: true,
            name: true,
            fileName: true,
            content: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to get eval question by ID:', error);
    throw error;
  }
}

/**
 * 更新測評題目
 * @param {string} id - 題目ID
 * @param {Object} data - 更新資料
 * @returns {Promise<Object>} - 更新後的題目
 */
export async function updateEvalQuestion(id, data) {
  try {
    return await db.evalDatasets.update({
      where: { id },
      data
    });
  } catch (error) {
    console.error('Failed to update eval question:', error);
    throw error;
  }
}

/**
 * 獲取專案測評題目統計
 * @param {string} projectId - 專案ID
 * @returns {Promise<Object>} - 統計資料
 */
export async function getEvalQuestionsStats(projectId) {
  try {
    const [total, byType, allTags] = await Promise.all([
      db.evalDatasets.count({ where: { projectId } }),
      db.evalDatasets.groupBy({
        by: ['questionType'],
        where: { projectId },
        _count: { id: true }
      }),
      db.evalDatasets.findMany({
        where: { projectId },
        select: { tags: true }
      })
    ]);

    const typeStats = {};
    byType.forEach(item => {
      typeStats[item.questionType] = item._count.id;
    });

    // 統計標籤
    const tagStats = {};
    allTags.forEach(item => {
      if (item.tags) {
        // 支援中英文逗號分隔
        const tags = item.tags
          .split(/[,，]/)
          .map(t => t.trim())
          .filter(Boolean);
        tags.forEach(tag => {
          tagStats[tag] = (tagStats[tag] || 0) + 1;
        });
      }
    });

    return {
      total,
      byType: typeStats,
      byTag: tagStats
    };
  } catch (error) {
    console.error('Failed to get eval questions stats:', error);
    throw error;
  }
}

/**
 * 根據文字塊ID獲取測評題目
 * @param {string} chunkId - 文字塊ID
 * @returns {Promise<Array>} - 測評題目陣列
 */
export async function getEvalQuestionsByChunkId(chunkId) {
  try {
    return await db.evalDatasets.findMany({
      where: { chunkId },
      orderBy: { createAt: 'desc' }
    });
  } catch (error) {
    console.error('Failed to get eval questions by chunk ID:', error);
    throw error;
  }
}

/**
 * 刪除測評題目
 * @param {string} id - 題目ID
 * @returns {Promise<Object>} - 刪除的題目
 */
export async function deleteEvalQuestion(id) {
  try {
    return await db.evalDatasets.delete({
      where: { id }
    });
  } catch (error) {
    console.error('Failed to delete eval question:', error);
    throw error;
  }
}
