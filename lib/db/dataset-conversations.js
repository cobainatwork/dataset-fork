/**
 * 多輪對話資料集資料庫操作
 */

import { db } from '@/lib/db/index';

function buildDatasetConversationWhere(projectId, filters = {}) {
  const where = { projectId };

  if (filters.keyword) {
    where.OR = [
      { question: { contains: filters.keyword } },
      { tags: { contains: filters.keyword } },
      { note: { contains: filters.keyword } }
    ];
  }

  if (filters.roleA) {
    where.roleA = { contains: filters.roleA };
  }
  if (filters.roleB) {
    where.roleB = { contains: filters.roleB };
  }
  if (filters.scenario) {
    where.scenario = { contains: filters.scenario };
  }

  if (filters.scoreMin !== undefined) {
    where.score = { ...where.score, gte: parseFloat(filters.scoreMin) };
  }
  if (filters.scoreMax !== undefined) {
    where.score = { ...where.score, lte: parseFloat(filters.scoreMax) };
  }

  if (filters.confirmed !== undefined) {
    if (typeof filters.confirmed === 'boolean') {
      where.confirmed = filters.confirmed;
    } else {
      where.confirmed = filters.confirmed === 'true';
    }
  }

  return where;
}

/**
 * 建立多輪對話資料集
 * @param {object} data - 對話資料集資料
 * @returns {Promise<object>} 建立的對話資料集
 */
export async function createDatasetConversation(data) {
  return await db.datasetConversations.create({
    data
  });
}

/**
 * 根據ID獲取多輪對話資料集
 * @param {string} id - 對話資料集ID
 * @returns {Promise<object|null>} 對話資料集或null
 */
export async function getDatasetConversationById(id) {
  return await db.datasetConversations.findUnique({
    where: { id },
    include: {
      project: true
    }
  });
}

/**
 * 分頁獲取多輪對話資料集列表
 * @param {string} projectId - 專案ID
 * @param {number} page - 頁碼
 * @param {number} pageSize - 頁大小
 * @param {object} filters - 篩選條件
 * @returns {Promise<object>} 分頁資料
 */
export async function getDatasetConversationsByPagination(projectId, page = 1, pageSize = 20, filters = {}) {
  const skip = (page - 1) * pageSize;
  const where = buildDatasetConversationWhere(projectId, filters);

  const [data, total] = await Promise.all([
    db.datasetConversations.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createAt: 'desc' },
      select: {
        id: true,
        question: true,
        scenario: true,
        turnCount: true,
        maxTurns: true,
        model: true,
        score: true,
        confirmed: true,
        createAt: true
      }
    }),
    db.datasetConversations.count({ where })
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

/**
 * 更新多輪對話資料集
 * @param {string} id - 對話資料集ID
 * @param {object} data - 更新資料
 * @returns {Promise<object>} 更新後的對話資料集
 */
export async function updateDatasetConversation(id, data) {
  return await db.datasetConversations.update({
    where: { id },
    data: {
      ...data,
      updateAt: new Date()
    }
  });
}

/**
 * 刪除多輪對話資料集
 * @param {string} id - 對話資料集ID
 * @returns {Promise<object>} 刪除的對話資料集
 */
export async function deleteDatasetConversation(id) {
  return await db.datasetConversations.delete({
    where: { id }
  });
}

/**
 * 獲取專案的多輪對話資料集統計資訊
 * @param {string} projectId - 專案ID
 * @returns {Promise<object>} 統計資訊
 */
export async function getDatasetConversationStats(projectId) {
  const [total, confirmed, avgScore] = await Promise.all([
    db.datasetConversations.count({
      where: { projectId }
    }),
    db.datasetConversations.count({
      where: { projectId, confirmed: true }
    }),
    db.datasetConversations.aggregate({
      where: { projectId, score: { gt: 0 } },
      _avg: { score: true }
    })
  ]);

  return {
    total,
    confirmed,
    unconfirmed: total - confirmed,
    avgScore: avgScore._avg.score || 0
  };
}

/**
 * 獲取所有多輪對話資料集（用於匯出）
 * @param {string} projectId - 專案ID
 * @param {object} filters - 篩選條件
 * @returns {Promise<Array>} 對話資料集列表
 */
export async function getAllDatasetConversations(projectId, filters = {}) {
  const where = buildDatasetConversationWhere(projectId, filters);

  return await db.datasetConversations.findMany({
    where,
    orderBy: { createAt: 'desc' }
  });
}

/**
 * 獲取符合篩選條件的全部對話 ID（用於批次操作）
 * @param {string} projectId
 * @param {object} filters
 * @returns {Promise<string[]>}
 */
export async function getAllDatasetConversationIds(projectId, filters = {}) {
  const where = buildDatasetConversationWhere(projectId, filters);
  const rows = await db.datasetConversations.findMany({
    where,
    select: { id: true },
    orderBy: { createAt: 'desc' }
  });
  return rows.map(item => String(item.id));
}

/**
 * 根據問題ID查詢相關的多輪對話資料集
 * @param {string} questionId - 問題ID
 * @returns {Promise<Array>} 相關的對話資料集
 */
export async function getDatasetConversationsByQuestionId(questionId) {
  return await db.datasetConversations.findMany({
    where: { questionId },
    orderBy: { createAt: 'desc' }
  });
}

/**
 * 獲取多輪對話的導航項（上一個/下一個對話）
 * @param {string} projectId - 專案ID
 * @param {string} conversationId - 當前對話ID
 * @param {string} operateType - 操作型別 ('prev' | 'next')
 * @returns {Promise<object|null>} 導航項或null
 */
export async function getConversationNavigationItems(projectId, conversationId, operateType) {
  const currentItem = await db.datasetConversations.findUnique({
    where: { id: conversationId }
  });

  if (!currentItem) {
    throw new Error('Current conversation does not exist');
  }

  if (operateType === 'prev') {
    return await db.datasetConversations.findFirst({
      where: {
        createAt: { gt: currentItem.createAt },
        projectId
      },
      orderBy: { createAt: 'asc' }
    });
  } else {
    return await db.datasetConversations.findFirst({
      where: {
        createAt: { lt: currentItem.createAt },
        projectId
      },
      orderBy: { createAt: 'desc' }
    });
  }
}
