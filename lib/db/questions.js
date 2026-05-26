'use server';
import { db } from '@/lib/db/index';
import { nanoid } from 'nanoid';

/**
 * 獲取專案的所有問題
 * @param {string} projectId - 專案ID
 * @param {number} page - 頁碼
 * @param {number} pageSize - 每頁大小
 * @param answered
 * @param input
 * @param chunkName - 文字塊名稱篩選
 * @param sourceType - 資料來源型別篩選 ('all', 'text', 'image')
 * @param searchMatchMode - 搜尋匹配模式 ('match', 'notMatch')
 * @returns {Promise<{data: Array, total: number}>} - 問題列表和總條數
 */
export async function getQuestions(
  projectId,
  page = 1,
  pageSize = 10,
  answered,
  input,
  chunkName,
  sourceType = 'all',
  searchMatchMode = 'match'
) {
  try {
    const whereClause = {
      projectId,
      ...(answered !== undefined && { answered: answered }), // 確保 answered 是布林值
      ...(input &&
        searchMatchMode === 'match' && { OR: [{ question: { contains: input } }, { label: { contains: input } }] }),
      ...(input && searchMatchMode === 'notMatch' && { question: { not: { contains: input } } }),
      ...(chunkName && { chunk: { name: { contains: chunkName } } }),
      ...(sourceType === 'text' && { imageId: null }),
      ...(sourceType === 'image' && { imageId: { not: null } })
    };

    const [data, total] = await Promise.all([
      db.questions.findMany({
        where: whereClause,
        orderBy: {
          createAt: 'desc'
        },
        include: {
          chunk: {
            select: {
              name: true,
              content: true
            }
          }
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.questions.count({
        where: whereClause
      })
    ]);

    // 批次查詢 datasetCount
    const datasetCounts = await getDatasetCountsForQuestions(data.map(item => item.id));

    // 合併 datasetCount 到問題項中
    const questionsWithDatasetCount = data.map((item, index) => ({
      ...item,
      datasetCount: datasetCounts[index]
    }));

    return { data: questionsWithDatasetCount, total };
  } catch (error) {
    console.error('Failed to get questions by projectId in database');
    throw error;
  }
}

/**
 * 獲取專案的所有問題（僅ID和標籤），用於樹形檢視
 * @param {string} projectId - 專案ID
 * @param {string} input - 搜尋關鍵詞
 * @param {boolean} isDistill - 是否只查詢蒸餾問題
 * @param {boolean} excludeImage - 是否排除圖片問題（label='image'），預設為 true
 * @returns {Promise<Array>} - 問題列表（僅包含ID和標籤）
 */
export async function getQuestionsForTree(projectId, input, isDistill = false, excludeImage = true) {
  try {
    // console.log('[getQuestionsForTree] 引數:', { projectId, input, isDistill, excludeImage });

    // 如果是蒸餾問題，需要先獲取蒸餾文字塊
    let whereClause = {
      projectId,
      question: { contains: input || '' }
    };

    // 排除圖片問題
    if (excludeImage) {
      whereClause.label = { not: 'image' };
    }

    if (isDistill) {
      // 獲取蒸餾文字塊
      const distillChunk = await db.chunks.findFirst({
        where: {
          projectId,
          name: 'Distilled Content'
        }
      });

      if (distillChunk) {
        whereClause.chunkId = distillChunk.id;
      }
    }

    const data = await db.questions.findMany({
      where: whereClause,
      select: {
        id: true,
        label: true,
        answered: true
      },
      orderBy: {
        createAt: 'desc'
      }
    });

    return data;
  } catch (error) {
    console.error('獲取樹形檢視問題失敗:', error);
    throw error;
  }
}

/**
 * 根據標籤獲取專案的問題
 * @param {string} projectId - 專案ID
 * @param {string} tag - 標籤名稱
 * @param {string} input - 搜尋關鍵詞
 * @param {boolean} isDistill - 是否只查詢蒸餾問題
 * @param {boolean} excludeImage - 是否排除圖片問題（label='image'），預設為 true
 * @returns {Promise<Array>} - 問題列表
 */
export async function getQuestionsByTag(projectId, tag, input, isDistill = false, excludeImage = true) {
  try {
    const whereClause = {
      projectId
    };

    if (input) {
      whereClause.question = { contains: input };
    }

    if (tag === 'uncategorized') {
      const { getTags } = await import('./tags');
      const tagsData = await getTags(projectId);

      const extractAllLabels = tags => {
        const labels = [];
        tags.forEach(tag => {
          labels.push(tag.label);
          if (tag.child && tag.child.length > 0) {
            labels.push(...extractAllLabels(tag.child));
          }
        });
        return labels;
      };

      const allTagLabels = extractAllLabels(tagsData || []);

      const orConditions = [];

      if (excludeImage) {
        if (allTagLabels.length > 0) {
          orConditions.push({
            AND: [{ label: { notIn: [...allTagLabels, 'image'] } }]
          });
        }

        // console.log('orConditions:', orConditions);
      } else {
        orConditions.push({ label: null }, { label: '' });

        if (allTagLabels.length > 0) {
          orConditions.push({ label: { notIn: allTagLabels } });
        }
      }

      whereClause.OR = orConditions;
    } else {
      if (excludeImage && tag === 'image') {
        return []; // 不返回任何問題
      }
      whereClause.label = { in: [tag] };
    }

    // 如果是蒸餾問題，需要先獲取蒸餾文字塊
    if (isDistill) {
      // 獲取蒸餾文字塊
      const distillChunk = await db.chunks.findFirst({
        where: {
          projectId,
          name: 'Distilled Content'
        }
      });

      if (distillChunk) {
        whereClause.chunkId = distillChunk.id;
      }
    }

    const data = await db.questions.findMany({
      where: whereClause,
      include: {
        chunk: {
          select: {
            name: true,
            content: true
          }
        }
      },
      orderBy: {
        createAt: 'desc'
      }
    });

    // 批次查詢 datasetCount
    const datasetCounts = await getDatasetCountsForQuestions(data.map(item => item.id));

    // 合併 datasetCount 到問題項中
    const questionsWithDatasetCount = data.map((item, index) => ({
      ...item,
      datasetCount: datasetCounts[index]
    }));

    return questionsWithDatasetCount;
  } catch (error) {
    console.error(`根據標籤獲取問題失敗 (${tag}):`, error);
    throw error;
  }
}

export async function getAllQuestionsByProjectId(projectId) {
  try {
    return await db.questions.findMany({
      where: { projectId },
      include: {
        chunk: {
          select: {
            name: true,
            content: true
          }
        }
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

export async function getQuestionsIds(
  projectId,
  answered,
  input,
  chunkName,
  sourceType = 'all',
  searchMatchMode = 'match'
) {
  try {
    const whereClause = {
      projectId,
      ...(answered !== undefined && { answered: answered }), // 確保 answered 是布林值
      ...(input &&
        searchMatchMode === 'match' && { OR: [{ question: { contains: input } }, { label: { contains: input } }] }),
      ...(input && searchMatchMode === 'notMatch' && { question: { not: { contains: input } } }),
      ...(chunkName && { chunk: { name: { contains: chunkName } } }),
      ...(sourceType === 'text' && { imageId: null }),
      ...(sourceType === 'image' && { imageId: { not: null } })
    };

    // 對於大資料量，新增限制以防止記憶體溢位
    const MAX_SELECTION = 10000; // 最多允許全選10000條

    const count = await db.questions.count({ where: whereClause });

    if (count > MAX_SELECTION) {
      console.warn(`嘗試選擇 ${count} 條問題，超過限制 ${MAX_SELECTION}，將只返回前 ${MAX_SELECTION} 條`);
    }

    return await db.questions.findMany({
      where: whereClause,
      select: {
        id: true
      },
      orderBy: {
        createAt: 'desc'
      },
      take: Math.min(count, MAX_SELECTION) // 限制最大數量
    });
  } catch (error) {
    console.error('Failed to get datasets ids in database');
    throw error;
  }
}

export async function getQuestionsByTagName(projectId, tagName) {
  try {
    return await db.questions.findMany({
      where: {
        projectId,
        label: tagName
      },
      include: {
        chunk: {
          select: {
            name: true
          }
        }
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
 * 批次獲取問題的 datasetCount
 * 包含普通資料集、圖片資料集和多輪對話資料集
 * @param {Array<string>} questionIds - 問題ID列表
 * @returns {Promise<Array<number>>} - 每個問題的 datasetCount 列表
 */
async function getDatasetCountsForQuestions(questionIds) {
  // 如果問題數量為0，直接返回空陣列
  if (questionIds.length === 0) {
    return [];
  }

  // 分批處理，避免 Prisma 引數限制（每批最多1000個）
  const BATCH_SIZE = 1000;
  const batches = [];
  for (let i = 0; i < questionIds.length; i += BATCH_SIZE) {
    batches.push(questionIds.slice(i, i + BATCH_SIZE));
  }

  // 1. 統計普通資料集（Datasets 表）- 分批查詢
  const datasetCountsArray = await Promise.all(
    batches.map(batch =>
      db.datasets.groupBy({
        by: ['questionId'],
        _count: {
          questionId: true
        },
        where: {
          questionId: {
            in: batch
          }
        }
      })
    )
  );
  const datasetCounts = datasetCountsArray.flat();

  // 2. 統計多輪對話資料集（datasetConversations 表）- 分批查詢
  const multiTurnCountsArray = await Promise.all(
    batches.map(batch =>
      db.datasetConversations.groupBy({
        by: ['questionId'],
        _count: {
          questionId: true
        },
        where: {
          questionId: {
            in: batch
          }
        }
      })
    )
  );
  const multiTurnCounts = multiTurnCountsArray.flat();

  // 3. 對於圖片問題，透過 imageId + question 統計 ImageDatasets
  // 先獲取圖片問題的 imageId 和問題文字 - 分批查詢
  const imageQuestionsArray = await Promise.all(
    batches.map(batch =>
      db.questions.findMany({
        where: {
          id: {
            in: batch
          },
          imageId: {
            not: null
          }
        },
        select: {
          id: true,
          imageId: true,
          question: true
        }
      })
    )
  );
  const imageQuestions = imageQuestionsArray.flat();

  // 統計圖片資料集
  const imageDatasetCounts = [];
  if (imageQuestions.length > 0) {
    // 為每個圖片問題統計對應的資料集數量
    const countPromises = imageQuestions.map(async q => {
      const count = await db.imageDatasets.count({
        where: {
          imageId: q.imageId,
          question: q.question
        }
      });
      return { questionId: q.id, count };
    });

    const counts = await Promise.all(countPromises);
    counts.forEach(item => {
      if (item.count > 0) {
        imageDatasetCounts.push({
          questionId: item.questionId,
          _count: { questionId: item.count }
        });
      }
    });
  }

  // 合併所有統計結果
  const totalCountMap = {};

  // 新增普通資料集統計
  datasetCounts.forEach(item => {
    totalCountMap[item.questionId] = (totalCountMap[item.questionId] || 0) + item._count.questionId;
  });

  // 新增多輪對話資料集統計
  multiTurnCounts.forEach(item => {
    totalCountMap[item.questionId] = (totalCountMap[item.questionId] || 0) + item._count.questionId;
  });

  // 新增圖片資料集統計
  imageDatasetCounts.forEach(item => {
    totalCountMap[item.questionId] = (totalCountMap[item.questionId] || 0) + item._count.questionId;
  });

  // 返回與 questionIds 順序對應的 datasetCount 列表
  return questionIds.map(id => totalCountMap[id] || 0);
}

export async function getQuestionById(id) {
  try {
    return await db.questions.findUnique({
      where: { id }
    });
  } catch (error) {
    console.error('Failed to get questions by name in database');
    throw error;
  }
}

export async function isExistByQuestion(question, projectId) {
  try {
    const count = await db.questions.count({
      where: {
        question,
        projectId
      }
    });
    return count > 0;
  } catch (error) {
    console.error('Failed to get questions by name in database');
    throw error;
  }
}

export async function getQuestionsCount(projectId) {
  try {
    return await db.questions.count({
      where: {
        projectId
      }
    });
  } catch (error) {
    console.error('Failed to get questions count in database');
    throw error;
  }
}

/**
 * 儲存專案的問題列表
 * @param {string} projectId - 專案ID
 * @param {Array} questions - 問題列表
 * @param chunkId
 * @returns {Promise<Array>} - 儲存後的問題列表
 */
export async function saveQuestions(projectId, questions, chunkId) {
  try {
    let data = questions.map(item => ({
      id: nanoid(),
      projectId,
      chunkId: chunkId ? chunkId : item.chunkId,
      question: item.question,
      label: item.label,
      imageId: item.imageId,
      imageName: item.imageName,
      templateId: item.templateId,
    }));
    const result = await db.questions.createMany({ data: data });
    await enqueueDedup(projectId, data.map(d => d.id));
    return result;
  } catch (error) {
    console.error('Failed to create questions in database');
    throw error;
  }
}

export async function updateQuestion(question) {
  try {
    return await db.questions.update({ where: { id: question.id }, data: question });
  } catch (error) {
    console.error('Failed to update questions in database');
    throw error;
  }
}

/**
 * 更新圖片問題的 answered 狀態
 * @param {string} projectId - 專案ID
 * @param {string} imageId - 圖片ID
 * @param {string} questionText - 問題文字
 * @param {boolean} answered - answered 狀態
 */
export async function updateQuestionAnsweredStatus(projectId, imageId, questionText, answered) {
  try {
    await db.questions.updateMany({
      where: {
        projectId,
        imageId,
        question: questionText
      },
      data: {
        answered
      }
    });
  } catch (error) {
    console.error('Failed to update question answered status:', error);
    throw error;
  }
}

/**
 * 儲存專案的問題列表（支援GA配對）
 * @param {string} projectId - 專案ID
 * @param {Array} questions - 問題列表
 * @param {string} chunkId - 文字塊ID
 * @param {string} gaPairId - GA配對ID（可選）
 * @returns {Promise<Array>} - 儲存後的問題列表
 */
export async function saveQuestionsWithGaPair(projectId, questions, chunkId, gaPairId = null) {
  try {
    let data = questions.map(item => ({
      id: nanoid(),
      projectId,
      chunkId: chunkId ? chunkId : item.chunkId,
      question: item.question,
      label: item.label,
      gaPairId: gaPairId,
    }));
    const result = await db.questions.createMany({ data: data });
    await enqueueDedup(projectId, data.map(d => d.id));
    return result;
  } catch (error) {
    console.error('Failed to create questions with GA pair in database');
    throw error;
  }
}

/**
 * 獲取指定文字塊的問題
 * @param {string} projectId - 專案ID
 * @param {string} chunkId - 文字塊ID
 * @returns {Promise<Array>} - 問題列表
 */
export async function getQuestionsForChunk(projectId, chunkId) {
  return await db.questions.findMany({ where: { projectId, chunkId } });
}

/**
 * 刪除單個問題
 * @param {string} questionId - 問題ID
 */
export async function deleteQuestion(questionId) {
  try {
    // console.log(questionId);
    return await db.questions.delete({
      where: {
        id: questionId
      }
    });
  } catch (error) {
    console.error('Failed to delete questions by id in database');
    throw error;
  }
}

/**
 * 批次刪除問題
 * @param {Array} questionIds
 */
export async function batchDeleteQuestions(questionIds) {
  try {
    return await db.questions.deleteMany({
      where: {
        id: {
          in: questionIds
        }
      }
    });
  } catch (error) {
    console.error('Failed to delete batch questions in database');
    throw error;
  }
}

export async function getQuestionTemplateById(id) {
  const { templateId } = await db.questions.findUnique({ where: { id } });
  if (templateId) {
    return await db.questionTemplates.findUnique({ where: { id: templateId } });
  }
}

async function enqueueDedup(projectId, questionIds) {
  if (!questionIds.length) return;
  try {
    const created = await db.task.create({
      data: {
        taskType: 'embedding-incremental',
        projectId,
        detail: JSON.stringify({ questionIds }),
        status: 0,
        modelInfo: '{}',
      },
    });
    // dynamic import：避免 lib/db <-> lib/services/tasks 之間的循環依賴
    const { processTask } = await import('@/lib/services/tasks');
    processTask(created.id).catch(e =>
      console.error(`[enqueueDedup] dispatcher failed for task=${created.id}`, e)
    );
  } catch (e) {
    console.error(`[enqueueDedup] failed for projectId=${projectId}`, e);
  }
}
