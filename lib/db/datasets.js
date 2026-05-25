'use server';
import { db } from '@/lib/db/index';

/**
 * 獲取資料集列表(根據專案ID)
 * @param projectId 專案id
 * @param page
 * @param pageSize
 * @param confirmed
 * @param input
 * @param field 搜尋欄位，可選值：question, answer, cot, questionLabel
 * @param hasCot 思維鏈篩選，可選值：all, yes, no
 * @param isDistill 蒸餾資料集篩選，可選值：all, yes, no
 * @param chunkName 文字塊名稱篩選
 */
export async function getDatasetsByPagination(
  projectId,
  page = 1,
  size = 10,
  confirmed = undefined,
  input = '',
  field = 'question',
  hasCot = 'all',
  isDistill = 'all',
  scoreRange = '',
  customTag = '',
  noteKeyword = '',
  chunkName = ''
) {
  try {
    // 根據搜尋欄位構建查詢條件
    const searchCondition = {};
    if (input) {
      if (field === 'question') {
        searchCondition.question = { contains: input };
      } else if (field === 'answer') {
        searchCondition.answer = { contains: input };
      } else if (field === 'cot') {
        searchCondition.cot = { contains: input };
      } else if (field === 'questionLabel') {
        searchCondition.questionLabel = { contains: input };
      }
    }

    // 思維鏈篩選條件
    const cotCondition = {};
    if (hasCot === 'yes') {
      cotCondition.cot = { not: '' };
    } else if (hasCot === 'no') {
      cotCondition.cot = '';
    }

    // 蒸餾資料集篩選條件
    const distillCondition = {};
    if (isDistill === 'yes') {
      distillCondition.chunkName = 'Distilled Content';
    } else if (isDistill === 'no') {
      distillCondition.chunkName = { not: 'Distilled Content' };
    }

    // 評分範圍篩選條件
    const scoreCondition = {};
    if (scoreRange) {
      const [minScore, maxScore] = scoreRange.split('-').map(Number);
      if (!isNaN(minScore) && !isNaN(maxScore)) {
        scoreCondition.score = {
          gte: minScore,
          lte: maxScore
        };
      }
    }

    // 自定義標籤篩選條件
    const tagCondition = {};
    if (customTag) {
      tagCondition.tags = {
        contains: customTag
      };
    }

    // 備註篩選條件
    const noteCondition = {};
    if (noteKeyword) {
      noteCondition.note = { contains: noteKeyword };
    }

    // 文字塊名稱篩選條件
    const chunkNameCondition = {};
    if (chunkName) {
      chunkNameCondition.chunkName = { contains: chunkName };
    }

    const whereClause = {
      projectId,
      ...(confirmed !== undefined && { confirmed: confirmed }),
      ...searchCondition,
      ...cotCondition,
      ...distillCondition,
      ...scoreCondition,
      ...tagCondition,
      ...noteCondition,
      ...chunkNameCondition
    };

    const [data, total, confirmedCount] = await Promise.all([
      db.datasets.findMany({
        where: whereClause,
        orderBy: {
          createAt: 'desc'
        },
        skip: (page - 1) * size,
        take: size
      }),
      db.datasets.count({
        where: whereClause
      }),
      db.datasets.count({
        where: { ...whereClause, confirmed: true }
      })
    ]);

    return { data, total, confirmedCount };
  } catch (error) {
    console.error('Failed to get datasets by pagination in database');
    throw error;
  }
}

export async function getDatasets(projectId, confirmed) {
  try {
    const whereClause = {
      projectId,
      ...(confirmed !== undefined && { confirmed: confirmed })
    };
    return await db.datasets.findMany({
      where: whereClause,
      select: {
        question: true,
        answer: true,
        cot: true,
        questionLabel: true
      },
      orderBy: {
        createAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Failed to get datasets in database');
    throw error;
  }
}

/**
 * 分批獲取資料集（用於大資料量匯出）
 * @param {string} projectId 專案ID
 * @param {boolean} confirmed 是否只獲取確認的資料
 * @param {number} offset 偏移量
 * @param {number} batchSize 批次大小
 * @returns {Promise<Array>} 資料集列表
 */
export async function getDatasetsBatch(projectId, confirmed, offset = 0, batchSize = 1000) {
  try {
    const whereClause = {
      projectId,
      ...(confirmed !== undefined && { confirmed: confirmed })
    };
    return await db.datasets.findMany({
      where: whereClause,
      select: {
        question: true,
        answer: true,
        cot: true,
        questionLabel: true,
        chunkName: true
      },
      orderBy: {
        createAt: 'desc'
      },
      skip: offset,
      take: batchSize
    });
  } catch (error) {
    console.error('Failed to get datasets batch in database');
    throw error;
  }
}

export async function getDatasetsIds(
  projectId,
  confirmed = undefined,
  input = '',
  field = 'question',
  hasCot = 'all',
  isDistill = 'all',
  scoreRange = '',
  customTag = '',
  noteKeyword = '',
  chunkName = ''
) {
  try {
    // 根據搜尋欄位構建查詢條件
    const searchCondition = {};
    if (input) {
      if (field === 'question') {
        searchCondition.question = { contains: input };
      } else if (field === 'answer') {
        searchCondition.answer = { contains: input };
      } else if (field === 'cot') {
        searchCondition.cot = { contains: input };
      } else if (field === 'questionLabel') {
        searchCondition.questionLabel = { contains: input };
      }
    }

    // 思維鏈篩選條件
    const cotCondition = {};
    if (hasCot === 'yes') {
      cotCondition.cot = { not: null };
      cotCondition.cot = { not: '' };
    } else if (hasCot === 'no') {
      cotCondition.OR = [{ cot: null }, { cot: '' }];
    }

    // 蒸餾資料集篩選條件
    const distillCondition = {};
    if (isDistill === 'yes') {
      distillCondition.chunkName = 'Distilled Content';
    } else if (isDistill === 'no') {
      distillCondition.chunkName = { not: 'Distilled Content' };
    }

    // 評分範圍篩選條件
    const scoreCondition = {};
    if (scoreRange) {
      const [minScore, maxScore] = scoreRange.split('-').map(Number);
      if (!isNaN(minScore) && !isNaN(maxScore)) {
        scoreCondition.score = {
          gte: minScore,
          lte: maxScore
        };
      }
    }

    // 自定義標籤篩選條件
    const tagCondition = {};
    if (customTag) {
      tagCondition.tags = {
        contains: customTag
      };
    }

    // 備註篩選條件
    const noteCondition = {};
    if (noteKeyword) {
      noteCondition.note = { contains: noteKeyword };
    }

    // 文字塊名稱篩選條件
    const chunkNameCondition = {};
    if (chunkName) {
      chunkNameCondition.chunkName = { contains: chunkName };
    }

    const whereClause = {
      projectId,
      ...(confirmed !== undefined && { confirmed: confirmed }),
      ...searchCondition,
      ...cotCondition,
      ...distillCondition,
      ...scoreCondition,
      ...tagCondition,
      ...noteCondition,
      ...chunkNameCondition
    };
    return await db.datasets.findMany({
      where: whereClause,
      select: {
        id: true
      },
      orderBy: {
        createAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Failed to get datasets ids in database');
    throw error;
  }
}

/**
 * 獲取資料集數量(根據專案ID)
 * @param projectId 專案id
 */
export async function getDatasetsCount(projectId) {
  try {
    return await db.datasets.count({
      where: {
        projectId
      }
    });
  } catch (error) {
    console.error('Failed to get datasets count by projectId in database');
    throw error;
  }
}

/**
 * 獲取資料集數量(根據問題Id)
 * @param questionId 問題Id
 */
export async function getDatasetsCountByQuestionId(questionId) {
  try {
    return await db.datasets.count({
      where: {
        questionId
      }
    });
  } catch (error) {
    console.error('Failed to get datasets count by projectId in database');
    throw error;
  }
}

/**
 * 獲取資料集詳情
 * @param id 資料集id
 */
export async function getDatasetsById(id) {
  try {
    return await db.datasets.findUnique({
      where: { id }
    });
  } catch (error) {
    console.error('Failed to get datasets by id in database');
    throw error;
  }
}

/**
 * 更新資料集的評分、標籤、備註
 * @param {string} id 資料集ID
 * @param {number} score 評分 (0-5)
 * @param {Array} tags 標籤陣列
 * @param {string} note 備註
 */
export async function updateDatasetMetadata(id, { score, tags, note }) {
  try {
    const updateData = {};

    if (score !== undefined) {
      updateData.score = score;
    }

    if (tags !== undefined) {
      updateData.tags = JSON.stringify(tags);
    }

    if (note !== undefined) {
      updateData.note = note;
    }

    return await db.datasets.update({
      where: { id },
      data: updateData
    });
  } catch (error) {
    console.error('Failed to update dataset metadata in database');
    throw error;
  }
}

/**
 * 獲取專案中所有使用過的自定義標籤
 * @param {string} projectId 專案ID
 */
export async function getUsedCustomTags(projectId) {
  try {
    const datasets = await db.datasets.findMany({
      where: {
        projectId,
        tags: { not: '' }
      },
      select: { tags: true }
    });

    const allTags = new Set();

    datasets.forEach(dataset => {
      try {
        const tags = JSON.parse(dataset.tags || '[]');
        tags.forEach(tag => allTags.add(tag));
      } catch (e) {
        // 忽略解析錯誤
      }
    });

    return Array.from(allTags).sort();
  } catch (error) {
    console.error('Failed to get used custom tags in database');
    throw error;
  }
}

/**
 * 儲存資料集列表
 * @param dataset
 */
export async function createDataset(dataset) {
  try {
    return await db.datasets.create({
      data: dataset
    });
  } catch (error) {
    console.error('Failed to save datasets in database');
    throw error;
  }
}

export async function updateDataset(dataset) {
  try {
    return await db.datasets.update({
      data: dataset,
      where: {
        id: dataset.id
      }
    });
  } catch (error) {
    console.error('Failed to update datasets in database');
    throw error;
  }
}

export async function deleteDataset(datasetId) {
  try {
    // 先獲取要刪除的資料集資訊，以獲取 questionId
    const dataset = await db.datasets.findUnique({
      where: { id: datasetId }
    });

    if (!dataset) {
      throw new Error('Dataset not found');
    }

    // 刪除資料集
    const deletedDataset = await db.datasets.delete({
      where: { id: datasetId }
    });

    // 檢查該問題是否還有其他資料集
    const remainingDatasets = await db.datasets.count({
      where: {
        questionId: dataset.questionId
      }
    });

    // 如果沒有其他資料集，將問題的 answered 狀態改為 false
    // 但需要先檢查問題是否存在（本地匯入的資料集可能使用隨機ID，對應的問題可能已被刪除）
    if (remainingDatasets === 0) {
      const question = await db.questions.findUnique({
        where: { id: dataset.questionId }
      });

      if (question) {
        await db.questions.update({
          where: { id: dataset.questionId },
          data: { answered: false }
        });
      }
    }

    return deletedDataset;
  } catch (error) {
    console.error('Failed to delete datasets in database');
    throw error;
  }
}

/**
 * 更新資料集的AI評估結果
 * @param {string} datasetId 資料集ID
 * @param {number} score 評估分數 (0-5)
 * @param {string} aiEvaluation AI評估結論
 */
export async function updateDatasetEvaluation(datasetId, score, aiEvaluation) {
  try {
    return await db.datasets.update({
      where: { id: datasetId },
      data: {
        score,
        aiEvaluation,
        updateAt: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to update dataset evaluation in database');
    throw error;
  }
}

export async function getDatasetsCounts(projectId) {
  try {
    const [total, confirmedCount] = await Promise.all([
      db.datasets.count({
        where: { projectId }
      }),
      db.datasets.count({
        where: { projectId, confirmed: true }
      })
    ]);

    return { total, confirmedCount };
  } catch (error) {
    console.error('Failed to delete datasets in database');
    throw error;
  }
}

export async function getNavigationItems(projectId, datasetId, operateType, filters = {}) {
  const currentItem = await db.datasets.findUnique({
    where: { id: datasetId }
  });
  if (!currentItem) {
    throw new Error('Current record does not exist');
  }

  const {
    confirmed,
    input = '',
    field = 'question',
    hasCot = 'all',
    isDistill = 'all',
    scoreRange = '',
    customTag = '',
    noteKeyword = '',
    chunkName = ''
  } = filters;

  // Build filter conditions to mirror getDatasetsByPagination
  const searchCondition = {};
  if (input) {
    if (field === 'question') searchCondition.question = { contains: input };
    else if (field === 'answer') searchCondition.answer = { contains: input };
    else if (field === 'cot') searchCondition.cot = { contains: input };
    else if (field === 'questionLabel') searchCondition.questionLabel = { contains: input };
  }

  const cotCondition = {};
  if (hasCot === 'yes') cotCondition.cot = { not: '' };
  else if (hasCot === 'no') cotCondition.cot = '';

  const distillCondition = {};
  if (isDistill === 'yes') distillCondition.chunkName = 'Distilled Content';
  else if (isDistill === 'no') distillCondition.chunkName = { not: 'Distilled Content' };

  const scoreCondition = {};
  if (scoreRange) {
    const [minScore, maxScore] = scoreRange.split('-').map(Number);
    if (!isNaN(minScore) && !isNaN(maxScore)) {
      scoreCondition.score = { gte: minScore, lte: maxScore };
    }
  }

  const tagCondition = {};
  if (customTag) tagCondition.tags = { contains: customTag };

  const noteCondition = {};
  if (noteKeyword) noteCondition.note = { contains: noteKeyword };

  const chunkNameCondition = {};
  if (chunkName) chunkNameCondition.chunkName = { contains: chunkName };

  const filterClause = {
    projectId,
    ...(confirmed !== undefined && { confirmed }),
    ...searchCondition,
    ...cotCondition,
    ...distillCondition,
    ...scoreCondition,
    ...tagCondition,
    ...noteCondition,
    ...chunkNameCondition
  };

  if (operateType === 'prev') {
    return await db.datasets.findFirst({
      where: { ...filterClause, createAt: { gt: currentItem.createAt } },
      orderBy: { createAt: 'asc' }
    });
  } else {
    return await db.datasets.findFirst({
      where: { ...filterClause, createAt: { lt: currentItem.createAt } },
      orderBy: { createAt: 'desc' }
    });
  }
}

/**
 * 獲取按標籤平衡的資料集
 * @param {string} projectId 專案ID
 * @param {Array} balanceConfig 平衡配置 [{tagLabel, maxCount}]
 * @param {boolean} confirmed 是否只獲取確認的資料
 * @returns {Promise<Array>} 平衡後的資料集列表
 */
export async function getBalancedDatasetsByTags(projectId, balanceConfig, confirmed) {
  try {
    const results = [];

    for (const config of balanceConfig) {
      const { tagLabel, maxCount } = config;

      // 獲取該標籤下的資料集
      const tagDatasets = await db.datasets.findMany({
        where: {
          projectId,
          questionLabel: tagLabel,
          ...(confirmed !== undefined && { confirmed: confirmed })
        },
        select: {
          question: true,
          answer: true,
          cot: true,
          questionLabel: true,
          chunkName: true
        },
        orderBy: {
          createAt: 'desc'
        },
        take: maxCount // 限制數量
      });

      results.push(...tagDatasets);
    }

    return results;
  } catch (error) {
    console.error('Failed to get balanced datasets by tags in database');
    throw error;
  }
}

/**
 * 分批獲取按標籤平衡的資料集（用於大資料量匯出）
 * @param {string} projectId 專案ID
 * @param {Array} balanceConfig 平衡配置 [{tagLabel, maxCount}]
 * @param {boolean} confirmed 是否只獲取確認的資料
 * @param {number} offset 偏移量
 * @param {number} batchSize 批次大小
 * @returns {Promise<{data: Array, hasMore: boolean}>} 分批資料和是否還有更多資料
 */
export async function getBalancedDatasetsByTagsBatch(
  projectId,
  balanceConfig,
  confirmed,
  offset = 0,
  batchSize = 1000
) {
  try {
    // 首先獲取所有符合條件的資料集ID（用於分頁）
    const allResults = [];

    for (const config of balanceConfig) {
      const { tagLabel, maxCount } = config;
      // 規範化 maxCount，防止傳入字串或非法值導致引擎異常
      const count = Number.isFinite(maxCount) ? maxCount : parseInt(maxCount) || 0;
      if (count <= 0) continue;

      // 獲取該標籤下的資料集ID
      const tagDatasets = await db.datasets.findMany({
        where: {
          projectId,
          questionLabel: tagLabel,
          ...(confirmed !== undefined && { confirmed: confirmed })
        },
        select: {
          id: true,
          createAt: true
        },
        orderBy: {
          createAt: 'desc'
        },
        take: count
      });

      allResults.push(...tagDatasets);
    }

    // 按建立時間排序
    allResults.sort((a, b) => new Date(b.createAt) - new Date(a.createAt));

    // 分頁獲取當前批次的ID
    const batchIds = allResults.slice(offset, offset + batchSize).map(item => item.id);

    // 如果當前批次沒有ID，直接返回空結果，避免 Prisma 在 in: [] 時可能出現的引擎異常
    if (!batchIds.length) {
      return { data: [], hasMore: false };
    }

    // 根據ID獲取完整資料
    const batchData = await db.datasets.findMany({
      where: {
        projectId,
        id: { in: batchIds }
      },
      select: {
        question: true,
        answer: true,
        cot: true,
        questionLabel: true,
        chunkName: true
      }
      // 不再額外排序，避免引擎在某些組合條件下出現異常
    });

    const hasMore = offset + batchSize < allResults.length;

    return {
      data: batchData,
      hasMore
    };
  } catch (error) {
    console.error('Failed to get balanced datasets by tags batch in database');
    throw error;
  }
}

/**
 * 獲取標籤的統計資訊（包含資料集數量）
 * @param {string} projectId 專案ID
 * @param {boolean} confirmed 是否只統計確認的資料
 * @returns {Promise<Array>} 標籤統計資訊
 */
export async function getTagsWithDatasetCounts(projectId, confirmed) {
  try {
    // 獲取所有標籤的資料集統計
    const tagCounts = await db.datasets.groupBy({
      by: ['questionLabel'],
      where: {
        projectId,
        ...(confirmed !== undefined && { confirmed: confirmed })
      },
      _count: {
        id: true
      }
    });

    // 轉換為更友好的格式
    return tagCounts.map(item => ({
      tagLabel: item.questionLabel,
      datasetCount: item._count.id
    }));
  } catch (error) {
    console.error('Failed to get tags with dataset counts in database');
    throw error;
  }
}

/**
 * 根據資料集 ID 列表獲取資料集
 * @param {string} projectId 專案 ID
 * @param {Array<string>} datasetIds 資料集 ID 列表
 * @returns {Promise<Array>} 資料集列表
 */
export async function getDatasetsByIds(projectId, datasetIds) {
  try {
    if (!datasetIds || datasetIds.length === 0) {
      return [];
    }

    return await db.datasets.findMany({
      where: {
        projectId,
        id: { in: datasetIds }
      },
      orderBy: {
        createAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Failed to get datasets by ids in database');
    throw error;
  }
}

/**
 * 根據資料集 ID 列表分批獲取資料集
 * @param {string} projectId 專案 ID
 * @param {Array<string>} datasetIds 資料集 ID 列表
 * @param {number} offset 偏移量
 * @param {number} batchSize 批次大小
 * @returns {Promise<Array>} 批次資料集列表
 */
export async function getDatasetsByIdsBatch(projectId, datasetIds, offset = 0, batchSize = 1000) {
  try {
    if (!datasetIds || datasetIds.length === 0) {
      return [];
    }

    // 分批獲取資料，例如從 offset 開始取 batchSize 條
    const batchIds = datasetIds.slice(offset, offset + batchSize);

    return await db.datasets.findMany({
      where: {
        projectId,
        id: { in: batchIds }
      },
      orderBy: {
        createAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Failed to get datasets by ids batch in database');
    throw error;
  }
}
