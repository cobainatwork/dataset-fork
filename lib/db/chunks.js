'use server';
import { db } from '@/lib/db/index';
import { ensureDir, getProjectRoot } from '@/lib/db/base';
import path from 'path';
import fs from 'fs';

export async function saveChunks(chunks) {
  try {
    return await db.chunks.createMany({ data: chunks });
  } catch (error) {
    console.error('Failed to create chunks in database');
    throw error;
  }
}

export async function getChunkById(chunkId) {
  try {
    return await db.chunks.findUnique({ where: { id: chunkId } });
  } catch (error) {
    console.error('Failed to get chunks by id in database');
    throw error;
  }
}

export async function getChunksByFileIds(fileIds) {
  try {
    return await db.chunks.findMany({
      where: { fileId: { in: fileIds } },
      include: {
        Questions: {
          select: {
            question: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to get chunks by id in database');
    throw error;
  }
}

// 獲取專案中所有文字片段的ID
export async function getChunkByProjectId(projectId, filter) {
  try {
    const whereClause = {
      projectId,
      NOT: {
        name: {
          in: ['Image Chunk', 'Distilled Content']
        }
      }
    };
    if (filter === 'generated') {
      whereClause.Questions = {
        some: {}
      };
    } else if (filter === 'ungenerated') {
      whereClause.Questions = {
        none: {}
      };
    }
    return await db.chunks.findMany({
      where: whereClause,
      include: {
        Questions: {
          select: {
            question: true
          }
        },
        EvalDatasets: {
          select: {
            id: true
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to get chunks by projectId in database');
    throw error;
  }
}

export async function deleteChunkById(chunkId) {
  try {
    const delQuestions = db.questions.deleteMany({ where: { chunkId } });
    const delChunk = db.chunks.delete({ where: { id: chunkId } });
    return await db.$transaction([delQuestions, delChunk]);
  } catch (error) {
    console.error('Failed to delete chunks by id in database');
    throw error;
  }
}

/**
 * 根據文字塊名稱獲取文字塊
 * @param {string} projectId - 專案ID
 * @param {string} chunkName - 文字塊名稱
 * @returns {Promise} - 查詢結果
 */
export async function getChunkByName(projectId, chunkName) {
  try {
    return await db.chunks.findFirst({
      where: {
        projectId,
        name: chunkName
      }
    });
  } catch (error) {
    console.error('根據名稱獲取文字塊失敗', error);
    throw error;
  }
}

/**
 * 批次根據文字塊名稱獲取文字塊內容
 * @param {string} projectId - 專案ID
 * @param {string[]} chunkNames - 文字塊名稱陣列
 * @returns {Promise<Object>} - 以 chunkName 為 key，content 為 value 的物件
 */
export async function getChunkContentsByNames(projectId, chunkNames) {
  try {
    if (!chunkNames || chunkNames.length === 0) {
      return {};
    }

    const chunks = await db.chunks.findMany({
      where: {
        projectId,
        name: { in: chunkNames }
      },
      select: {
        name: true,
        content: true
      }
    });

    // 轉換為 name -> content 的對映
    const contentMap = {};
    chunks.forEach(chunk => {
      contentMap[chunk.name] = chunk.content;
    });

    return contentMap;
  } catch (error) {
    console.error('批次獲取文字塊內容失敗', error);
    throw error;
  }
}

/**
 * 根據檔案ID刪除所有相關文字塊
 * @param {string} projectId - 專案ID
 * @param {string} fileId - 檔案ID
 * @returns {Promise} - 刪除操作的結果
 */
export async function deleteChunksByFileId(projectId, fileId) {
  try {
    // 查詢與該檔案相關的所有文字塊
    const chunks = await db.chunks.findMany({
      where: { projectId, fileId },
      select: { id: true }
    });

    // 提取文字塊ID
    const chunkIds = chunks.map(chunk => chunk.id);

    // 如果沒有找到文字塊，直接返回
    if (chunkIds.length === 0) {
      return { count: 0 };
    }

    // 刪除相關的問題
    const delQuestions = db.questions.deleteMany({
      where: { chunkId: { in: chunkIds } }
    });

    // 刪除文字塊
    const delChunks = db.chunks.deleteMany({
      where: { id: { in: chunkIds } }
    });

    // 使用事務確保原子性操作
    const result = await db.$transaction([delQuestions, delChunks]);

    return { count: result[1].count };
  } catch (error) {
    console.error('刪除檔案相關文字塊失敗:', error);
    throw error;
  }
}

export async function updateChunkById(chunkId, chunkData) {
  try {
    return await db.chunks.update({ where: { id: chunkId }, data: chunkData });
  } catch (error) {
    console.error('Failed to update chunks by id in database');
    throw error;
  }
}

// 刪除檔案及相關TOC檔案
// TODO 後期最佳化 將檔案也新增表結構關聯 防止刪除錯誤
export async function deleteChunkAndFile(projectId, fileName) {
  try {
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    const filesDir = path.join(projectPath, 'files');
    const tocDir = path.join(projectPath, 'toc');

    // 確保目錄存在
    await ensureDir(tocDir);

    // 刪除原始檔案
    const filePath = path.join(filesDir, fileName);
    try {
      await fs.promises.access(filePath);
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.error(`刪除檔案 ${fileName} 失敗:`, error);
      // 如果檔案不存在，繼續處理
    }

    // 刪除相關的TOC檔案
    const baseName = path.basename(fileName, path.extname(fileName));
    const tocPath = path.join(filesDir, `${baseName}-toc.json`);
    try {
      await fs.promises.access(tocPath);
      await fs.promises.unlink(tocPath);
    } catch (error) {
      // 如果TOC檔案不存在，繼續處理
    }

    // TODO 暫不刪除資料庫中Chunk資料 如果刪除 Question Dataset關聯的Chunk資料是否也要刪除？
    // return await db.chunks.deleteMany({
    //     where: {
    //         name: {
    //             startsWith: baseName + '-part-',
    //         }, projectId
    //     }
    // });
  } catch (error) {
    console.error('Failed to delete chunks by id in database');
    throw error;
  }
}

// 更新文字塊內容
export async function updateChunkContent(chunkId, newContent) {
  try {
    return await db.chunks.update({
      where: { id: chunkId },
      data: {
        content: newContent,
        size: newContent.length
      }
    });
  } catch (error) {
    console.error('Failed to update chunk content in database');
    throw error;
  }
}

// 獲取文字塊列表（支援分頁）
export async function getChunks(projectId, page = 1, pageSize = 20) {
  try {
    const whereClause = {
      projectId,
      NOT: {
        name: {
          in: ['Image Chunk', 'Distilled Content']
        }
      }
    };

    const [data, total] = await Promise.all([
      db.chunks.findMany({
        where: whereClause,
        orderBy: {
          createAt: 'desc'
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.chunks.count({
        where: whereClause
      })
    ]);

    return {
      data,
      total,
      page,
      pageSize
    };
  } catch (error) {
    console.error('Failed to get chunks with pagination:', error);
    throw error;
  }
}
