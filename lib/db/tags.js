'use server';

import path from 'path';
import { getProjectRoot, readJsonFile, writeJsonFile } from './base';
import { db } from '@/lib/db/index';
import fs from 'fs';

// 獲取標籤樹
export async function getTags(projectId) {
  try {
    return await getTagsTreeWithQuestionCount(projectId);
  } catch (error) {
    return [];
  }
}

// 最佳化後的遞迴查詢樹狀結構，並統計問題數量
async function getTagsTreeWithQuestionCount(projectId, parentId = null) {
  // 一次性獲取所有相關標籤
  const allTags = await db.tags.findMany({
    where: { projectId },
    orderBy: { label: 'asc' }
  });

  // 建立標籤對映以便快速查詢
  const tagMap = new Map();
  const tagTree = [];

  // 初始化標籤對映
  allTags.forEach(tag => {
    tagMap.set(tag.id, {
      ...tag,
      questionCount: 0,
      child: []
    });
  });

  // 構建樹結構
  allTags.forEach(tag => {
    if (tag.parentId === parentId) {
      tagTree.push(tagMap.get(tag.id));
    } else if (tag.parentId && tagMap.has(tag.parentId)) {
      tagMap.get(tag.parentId).child.push(tagMap.get(tag.id));
    }
  });

  // 獲取該專案的所有問題並按標籤分組統計
  const questionCounts = await db.questions.groupBy({
    by: ['label'],
    where: { projectId },
    _count: {
      id: true
    }
  });

  // 建立標籤到問題數量的對映
  const questionCountMap = new Map();
  questionCounts.forEach(item => {
    questionCountMap.set(item.label, item._count.id);
  });

  // 為每個標籤設定直接問題數量
  allTags.forEach(tag => {
    const count = questionCountMap.get(tag.label) || 0;
    tagMap.get(tag.id).questionCount = count;
  });

  // 數字感知的標籤比較函式
  function compareLabels(tag1, tag2) {
    const label1 = tag1.label;
    const label2 = tag2.label;

    if (!label1 && !label2) return 0;
    if (!label1) return -1;
    if (!label2) return 1;

    // 使用正則表示式匹配以數字或小數開頭的部分
    const numberPattern = /^(\d+(\.\d+)?)\s*(.*)/;

    const match1 = label1.match(numberPattern);
    const match2 = label2.match(numberPattern);

    // 如果兩個label都以數字或小數開頭
    if (match1 && match2) {
      // 提取數字部分並轉換為float進行比較
      const num1 = parseFloat(match1[1]);
      const num2 = parseFloat(match2[1]);

      // 如果數字部分不相等，按數字排序
      if (num1 !== num2) {
        return num1 - num2;
      }

      // 如果數字部分相等，按剩餘部分排序
      const rest1 = match1[3] || '';
      const rest2 = match2[3] || '';
      return rest1.localeCompare(rest2);
    }

    // 如果不都以數字開頭，按字串排序
    return label1.localeCompare(label2);
  }

  // 對標籤樹進行遞迴排序
  function sortTagTree(tag) {
    // 對當前節點的子節點進行排序
    tag.child.sort(compareLabels);

    // 遞迴對所有子節點進行排序
    tag.child.forEach(child => sortTagTree(child));
  }

  // 對所有根節點進行排序
  tagTree.sort(compareLabels);

  // 遞迴排序每個根節點下的子樹
  tagTree.forEach(root => sortTagTree(root));

  return tagTree;
}

// 已廢棄的方法，保留以確保向後相容性
async function getAllLabels(tagId) {
  const labels = [];
  const queue = [tagId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const tag = await db.tags.findUnique({
      where: { id: currentId }
    });

    if (tag) {
      labels.push(tag.label);
      // 獲取子分類的 ID，加入佇列
      const children = await db.tags.findMany({
        where: { parentId: currentId },
        select: { id: true }
      });
      queue.push(...children.map(child => child.id));
    }
  }

  return labels;
}

export async function createTag(projectId, label, parentId) {
  try {
    let data = {
      projectId,
      label
    };
    if (parentId) {
      data.parentId = parentId;
    }
    return await db.tags.create({ data });
  } catch (error) {
    console.error('Error insert tags db:', error);
    throw error;
  }
}

export async function updateTag(label, id) {
  try {
    return await db.tags.update({ where: { id }, data: { label } });
  } catch (error) {
    console.error('Error update tags db:', error);
    throw error;
  }
}

/**
 * 刪除標籤及其所有子標籤、問題和資料集
 * @param {string} id - 要刪除的標籤 ID
 * @returns {Promise<object>} 刪除結果
 */
export async function deleteTag(id) {
  try {
    console.log(`開始刪除標籤: ${id}`);

    // 1. 獲取要刪除的標籤
    const tag = await db.tags.findUnique({
      where: { id }
    });

    if (!tag) {
      throw new Error(`標籤不存在: ${id}`);
    }

    // 2. 獲取所有子標籤（所有層級）
    const allChildTags = await getAllChildTags(id, tag.projectId);
    console.log(`找到 ${allChildTags.length} 個子標籤需要刪除`);

    // 3. 從葉子節點開始刪除，防止外部索引鍵約束問題
    for (const childTag of allChildTags.reverse()) {
      // 刪除與標籤相關的資料集
      await deleteDatasetsByTag(childTag.label, childTag.projectId);

      // 刪除與標籤相關的問題
      await deleteQuestionsByTag(childTag.label, childTag.projectId);

      // 刪除標籤
      await db.tags.delete({ where: { id: childTag.id } });
      console.log(`刪除子標籤: ${childTag.id} (${childTag.label})`);
    }

    // 4. 刪除與當前標籤相關的資料集
    await deleteDatasetsByTag(tag.label, tag.projectId);

    // 5. 刪除與當前標籤相關的問題
    await deleteQuestionsByTag(tag.label, tag.projectId);

    // 6. 刪除當前標籤
    console.log(`刪除主標籤: ${id} (${tag.label})`);
    return await db.tags.delete({ where: { id } });
  } catch (error) {
    console.error('刪除標籤時出錯:', error);
    throw error;
  }
}

/**
 * 獲取標籤的所有子標籤（所有層級）
 * @param {string} parentId - 父標籤 ID
 * @param {string} projectId - 專案 ID
 * @returns {Promise<Array>} 所有子標籤列表
 */
async function getAllChildTags(parentId, projectId) {
  const result = [];

  // 遞迴獲取子標籤
  async function fetchChildTags(pid) {
    // 查詢直接子標籤
    const children = await db.tags.findMany({
      where: {
        parentId: pid,
        projectId
      }
    });

    // 如果有子標籤
    if (children.length > 0) {
      // 將子標籤新增到結果中
      result.push(...children);

      // 遞迴獲取每個子標籤的子標籤
      for (const child of children) {
        await fetchChildTags(child.id);
      }
    }
  }

  // 開始遞迴獲取
  await fetchChildTags(parentId);

  return result;
}

/**
 * 刪除與標籤相關的問題
 * @param {string} label - 標籤名稱
 * @param {string} projectId - 專案 ID
 */
async function deleteQuestionsByTag(label, projectId) {
  try {
    // 查詢並刪除與標籤相關的所有問題
    await db.questions.deleteMany({
      where: {
        label,
        projectId
      }
    });
  } catch (error) {
    console.error(`刪除標籤 "${label}" 相關問題時出錯:`, error);
    throw error;
  }
}

/**
 * 刪除與標籤相關的資料集
 * @param {string} label - 標籤名稱
 * @param {string} projectId - 專案 ID
 */
async function deleteDatasetsByTag(label, projectId) {
  try {
    // 查詢並刪除與標籤相關的所有資料集
    await db.datasets.deleteMany({
      where: {
        questionLabel: label,
        projectId
      }
    });
  } catch (error) {
    console.error(`刪除標籤 "${label}" 相關資料集時出錯:`, error);
    throw error;
  }
}

// 儲存整個標籤樹
export async function batchSaveTags(projectId, tags) {
  try {
    // 僅在入口函式刪除所有標籤，避免遞迴中重複刪除
    await db.tags.deleteMany({ where: { projectId } });
    // 處理標籤樹
    await insertTags(projectId, tags);
  } catch (error) {
    console.error('Error insert tags db:', error);
    throw error;
  }
}

async function insertTags(projectId, tags, parentId = null) {
  // 刪除操作已移至外層函式，這裡不再需要
  for (const tag of tags) {
    // 插入當前節點
    const createdTag = await db.tags.create({
      data: {
        projectId,
        label: tag.label,
        parentId: parentId
      }
    });
    // 如果有子節點，遞迴插入
    if (tag.child && tag.child.length > 0) {
      await insertTags(projectId, tag.child, createdTag.id);
    }
  }
}
