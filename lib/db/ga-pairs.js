'use server';
import { db } from '@/lib/db/index';

/**
 * 獲取檔案的所有 GA 對
 * @param {string} fileId - 檔案 ID
 * @returns {Promise<Array>} GA 對列表
 */
export async function getGaPairsByFileId(fileId) {
  try {
    return await db.gaPairs.findMany({
      where: { fileId },
      orderBy: { pairNumber: 'asc' }
    });
  } catch (error) {
    console.error('Failed to get GA pairs by fileId in database:', error);
    throw error;
  }
}

/**
 * 獲取專案的所有 GA 對
 * @param {string} projectId - 專案 ID
 * @returns {Promise<Array>} GA 對列表
 */
export async function getGaPairsByProjectId(projectId) {
  try {
    return await db.gaPairs.findMany({
      where: { projectId },
      include: {
        uploadFile: {
          select: {
            fileName: true
          }
        }
      },
      orderBy: [{ fileId: 'asc' }, { pairNumber: 'asc' }]
    });
  } catch (error) {
    console.error('Failed to get GA pairs by projectId in database:', error);
    throw error;
  }
}

/**
 * 建立 GA 對
 * @param {Array} gaPairs - GA 對資料陣列
 * @returns {Promise<Array>} 建立的 GA 對
 */
export async function createGaPairs(gaPairs) {
  try {
    return await db.gaPairs.createManyAndReturn({ data: gaPairs });
  } catch (error) {
    console.error('Failed to create GA pairs in database:', error);
    throw error;
  }
}

/**
 * 更新單個 GA 對
 * @param {string} id - GA 對 ID
 * @param {Object} data - 更新資料
 * @returns {Promise<Object>} 更新後的 GA 對
 */
export async function updateGaPair(id, data) {
  try {
    return await db.gaPairs.update({
      where: { id },
      data
    });
  } catch (error) {
    console.error('Failed to update GA pair in database:', error);
    throw error;
  }
}

/**
 * 刪除檔案的所有 GA 對
 * @param {string} fileId - 檔案 ID
 * @returns {Promise<Object>} 刪除結果
 */
export async function deleteGaPairsByFileId(fileId) {
  try {
    return await db.gaPairs.deleteMany({
      where: { fileId }
    });
  } catch (error) {
    console.error('Failed to delete GA pairs by fileId in database:', error);
    throw error;
  }
}

/**
 * 切換 GA 對的啟用狀態
 * @param {string} id - GA 對 ID
 * @param {boolean} isActive - 啟用狀態
 * @returns {Promise<Object>} 更新後的 GA 對
 */
export async function toggleGaPairActive(id, isActive) {
  try {
    return await db.gaPairs.update({
      where: { id },
      data: { isActive }
    });
  } catch (error) {
    console.error('Failed to toggle GA pair active status in database:', error);
    throw error;
  }
}

/**
 * 獲取檔案的啟用 GA 對
 * @param {string} fileId - 檔案 ID
 * @returns {Promise<Array>} 啟用的 GA 對列表
 */
export async function getActiveGaPairsByFileId(fileId) {
  try {
    return await db.gaPairs.findMany({
      where: {
        fileId,
        isActive: true
      },
      orderBy: { pairNumber: 'asc' }
    });
  } catch (error) {
    console.error('Failed to get active GA pairs by fileId in database:', error);
    throw error;
  }
}

/**
 * 批次更新 GA 對
 * @param {Array} updates - 更新資料陣列，每個包含 id 和其他欄位
 * @returns {Promise<Array>} 更新結果
 */
export async function batchUpdateGaPairs(updates) {
  try {
    const results = await Promise.all(
      updates.map(({ id, ...updateData }) => {
        // 過濾掉不應該更新的欄位
        const { createAt, updateAt, projectId, fileId, pairNumber, ...data } = updateData;

        // 確保有資料需要更新
        if (Object.keys(data).length === 0) {
          console.warn(`No data to update for GA pair ${id}`);
          return Promise.resolve(null);
        }

        return db.gaPairs.update({
          where: { id },
          data
        });
      })
    );

    // 過濾掉null結果
    return results.filter(result => result !== null);
  } catch (error) {
    console.error('Failed to batch update GA pairs in database:', error);
    throw error;
  }
}

/**
 * Generate and save GA pairs for a specific file using LLM
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @param {Array} gaPairs - Array of GA pair objects from LLM
 * @returns {Promise<Array>} - Created GA pairs
 */
export async function saveGaPairs(projectId, fileId, gaPairs) {
  try {
    // First, delete existing GA pairs for this file to avoid conflicts
    await db.gaPairs.deleteMany({
      where: { projectId, fileId }
    });

    // Map the GA pairs to database format
    const gaPairData = gaPairs.map((pair, index) => ({
      projectId,
      fileId,
      pairNumber: index + 1, // 1-5
      genreTitle: pair.genre.title,
      genreDesc: pair.genre.description,
      audienceTitle: pair.audience.title,
      audienceDesc: pair.audience.description,
      isActive: true
    }));

    return await db.gaPairs.createMany({ data: gaPairData });
  } catch (error) {
    console.error('Failed to save GA pairs in database:', error);
    throw error;
  }
}

/**
 * Check if GA pairs exist for a file
 * @param {string} projectId - Project ID
 * @param {string} fileId - File ID
 * @returns {Promise<boolean>} - Whether GA pairs exist
 */
export async function hasGaPairs(projectId, fileId) {
  try {
    const count = await db.gaPairs.count({
      where: { projectId, fileId }
    });
    return count > 0;
  } catch (error) {
    console.error('Failed to check GA pairs existence:', error);
    throw error;
  }
}

/**
 * Get GA pair statistics for a project
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} - GA pair statistics
 */
export async function getGaPairStats(projectId) {
  try {
    const totalCount = await db.gaPairs.count({
      where: { projectId }
    });

    const activeCount = await db.gaPairs.count({
      where: { projectId, isActive: true }
    });

    const filesWithGaPairs = await db.gaPairs.groupBy({
      by: ['fileId'],
      where: { projectId }
    });

    return {
      totalPairs: totalCount,
      activePairs: activeCount,
      filesWithPairs: filesWithGaPairs.length
    };
  } catch (error) {
    console.error('Failed to get GA pair statistics:', error);
    throw error;
  }
}
