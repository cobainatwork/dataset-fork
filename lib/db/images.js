'use server';
import { db } from '@/lib/db/index';
import { getProjectPath } from '@/lib/db/base';
import { getMimeType } from '@/lib/util/image';

/**
 * 獲取專案的圖片列表（分頁）
 */
export async function getImages(projectId, page = 1, pageSize = 20, imageName = '', hasQuestions, hasDatasets, simple) {
  try {
    // 構建基礎查詢條件
    const baseWhereClause = {
      projectId,
      ...(imageName && { imageName: { contains: imageName } })
    };

    // 如果有過濾條件，需要使用複雜查詢
    if (hasQuestions !== undefined || hasDatasets !== undefined) {
      // 先獲取所有符合基礎條件的圖片ID和統計資訊
      const allImages = await db.images.findMany({
        where: baseWhereClause,
        orderBy: {
          createAt: 'desc'
        }
      });

      if (simple) {
        return { data: allImages };
      }

      // 獲取每個圖片的統計資訊並應用過濾
      const imagesWithStats = await Promise.all(
        allImages.map(async image => {
          const [questionCount, datasetCount] = await Promise.all([
            db.questions.count({
              where: {
                projectId,
                imageId: image.id
              }
            }),
            db.imageDatasets.count({
              where: {
                imageId: image.id
              }
            })
          ]);

          return {
            ...image,
            questionCount,
            datasetCount
          };
        })
      );

      // 應用篩選條件
      let filteredImages = imagesWithStats;
      if (hasQuestions === 'true') {
        filteredImages = filteredImages.filter(img => img.questionCount > 0);
      } else if (hasQuestions === 'false') {
        filteredImages = filteredImages.filter(img => img.questionCount === 0);
      }

      if (hasDatasets === 'true') {
        filteredImages = filteredImages.filter(img => img.datasetCount > 0);
      } else if (hasDatasets === 'false') {
        filteredImages = filteredImages.filter(img => img.datasetCount === 0);
      }

      // 應用分頁
      const total = filteredImages.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedImages = filteredImages.slice(startIndex, endIndex);

      // 為分頁後的圖片新增 base64 資料
      const imagesWithBase64 = await Promise.all(
        paginatedImages.map(async image => {
          let base64Image = null;
          try {
            const fs = require('fs/promises');
            const path = require('path');
            const projectPath = await getProjectPath(projectId);
            const imagePath = path.join(projectPath, 'images', image.imageName);
            const imageBuffer = await fs.readFile(imagePath);
            const ext = path.extname(image.imageName).toLowerCase();
            const mimeTypes = {
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.png': 'image/png',
              '.gif': 'image/gif',
              '.bmp': 'image/bmp',
              '.webp': 'image/webp',
              '.svg': 'image/svg+xml'
            };
            const mimeType = mimeTypes[ext] || 'image/jpeg';
            base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
          } catch (err) {
            console.warn(`Failed to read image: ${image.imageName}`, err);
          }

          return {
            ...image,
            base64: base64Image
          };
        })
      );

      return {
        data: imagesWithBase64,
        total,
        page,
        pageSize
      };
    } else {
      // 沒有過濾條件時，使用原來的簡單查詢
      const [data, total] = await Promise.all([
        db.images.findMany({
          where: baseWhereClause,
          orderBy: {
            createAt: 'desc'
          },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        db.images.count({
          where: baseWhereClause
        })
      ]);

      // 獲取每個圖片的問題和資料集數量，並讀取圖片為 base64
      const imagesWithStats = await Promise.all(
        data.map(async image => {
          const [questionCount, datasetCount] = await Promise.all([
            db.questions.count({
              where: {
                projectId,
                imageId: image.id
              }
            }),
            db.imageDatasets.count({
              where: {
                imageId: image.id
              }
            })
          ]);

          // 讀取圖片檔案並轉換為 base64
          let base64Image = null;
          try {
            const fs = require('fs/promises');
            const path = require('path');
            const projectPath = await getProjectPath(projectId);
            const imagePath = path.join(projectPath, 'images', image.imageName);
            const imageBuffer = await fs.readFile(imagePath);
            const mimeType = getMimeType(image.imageName);
            base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
          } catch (err) {
            console.warn(`Failed to read image: ${image.imageName}`, err);
          }

          return {
            ...image,
            questionCount,
            datasetCount,
            base64: base64Image
          };
        })
      );

      return {
        data: imagesWithStats,
        total,
        page,
        pageSize
      };
    }
  } catch (error) {
    console.error('Failed to get images:', error);
    throw error;
  }
}

/**
 * 建立圖片記錄
 */
export async function createImage(projectId, imageData) {
  try {
    return await db.images.create({
      data: {
        projectId,
        ...imageData
      }
    });
  } catch (error) {
    console.error('Failed to create image:', error);
    throw error;
  }
}

/**
 * 批次建立圖片記錄
 */
export async function createImages(projectId, imagesData) {
  try {
    const results = [];
    for (const imageData of imagesData) {
      // 檢查是否已存在
      const existing = await db.images.findFirst({
        where: {
          projectId,
          imageName: imageData.imageName
        }
      });

      if (existing) {
        // 更新現有記錄
        const updated = await db.images.update({
          where: { id: existing.id },
          data: imageData
        });
        results.push(updated);
      } else {
        // 建立新記錄
        const created = await db.images.create({
          data: {
            projectId,
            ...imageData
          }
        });
        results.push(created);
      }
    }
    return results;
  } catch (error) {
    console.error('Failed to create images:', error);
    throw error;
  }
}

/**
 * 根據圖片 ID 獲取圖片
 */
export async function getImageById(imageId) {
  try {
    return await db.images.findUnique({
      where: { id: imageId }
    });
  } catch (error) {
    console.error('Failed to get image by id:', error);
    throw error;
  }
}

/**
 * 根據圖片名稱獲取圖片
 */
export async function getImageByName(projectId, imageName) {
  try {
    return await db.images.findFirst({
      where: {
        projectId,
        imageName
      }
    });
  } catch (error) {
    console.error('Failed to get image by name:', error);
    throw error;
  }
}

/**
 * 刪除圖片
 */
export async function deleteImage(imageId) {
  try {
    return await db.images.delete({
      where: { id: imageId }
    });
  } catch (error) {
    console.error('Failed to delete image:', error);
    throw error;
  }
}

/**
 * 獲取圖片詳情（包含統計資訊）
 */
export async function getImageDetail(imageId) {
  try {
    const image = await db.images.findUnique({
      where: { id: imageId }
    });

    if (!image) {
      return null;
    }

    const [questionCount, datasetCount] = await Promise.all([
      db.questions.count({
        where: {
          projectId: image.projectId,
          imageId: image.id
        }
      }),
      db.imageDatasets.count({
        where: {
          imageId: image.id
        }
      })
    ]);

    return {
      ...image,
      questionCount,
      datasetCount
    };
  } catch (error) {
    console.error('Failed to get image detail:', error);
    throw error;
  }
}

export async function getImageChunk(projectId) {
  let imageChunk = await db.chunks.findFirst({
    where: {
      projectId,
      name: 'Image Chunk'
    }
  });

  if (!imageChunk) {
    imageChunk = await db.chunks.create({
      data: {
        name: 'Image Chunk',
        projectId,
        fileId: 'image',
        fileName: 'image.md',
        content: '',
        summary: '',
        size: 0
      }
    });
  }

  return imageChunk;
}
