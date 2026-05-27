'use server';
import { db } from '@/lib/db/index';
import fs from 'fs';
import path from 'path';
import { deleteDataset } from './datasets';
import { deleteChunkById } from './chunks';
import { enqueueClusterMaintenance } from './cluster-maintenance-enqueue';

//獲取檔案列表
export async function getUploadFilesPagination(projectId, page = 1, pageSize = 10, fileName) {
  try {
    const whereClause = {
      projectId,
      fileName: { contains: fileName }
    };
    const [data, total] = await Promise.all([
      db.uploadFiles.findMany({
        where: whereClause,
        orderBy: {
          createAt: 'desc'
        },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      db.uploadFiles.count({
        where: whereClause
      })
    ]);
    return { data, total };
  } catch (error) {
    console.error('Failed to get uploadFiles by pagination in database');
    throw error;
  }
}

export async function getUploadFileInfoById(fileId) {
  try {
    return await db.uploadFiles.findUnique({ where: { id: fileId } });
  } catch (error) {
    console.error('Failed to get uploadFiles by id in database');
    throw error;
  }
}

export async function getUploadFilesByProjectId(projectId) {
  try {
    return await db.uploadFiles.findMany({
      where: {
        projectId,
        NOT: {
          id: {
            in: await db.chunks
              .findMany({
                where: { projectId },
                select: { fileId: true }
              })
              .then(chunks => chunks.map(chunk => chunk.fileId))
          }
        }
      }
    });
  } catch (error) {
    console.error('Failed to get uploadFiles by id in database');
    throw error;
  }
}

export async function checkUploadFileInfoByMD5(projectId, md5) {
  try {
    return await db.uploadFiles.findFirst({
      where: {
        projectId,
        md5
      }
    });
  } catch (error) {
    console.error('Failed to check uploadFiles by md5 in database');
    throw error;
  }
}

export async function createUploadFileInfo(fileInfo) {
  try {
    const created = await db.uploadFiles.create({ data: fileInfo });
    if (!created.lineageId) {
      return await db.uploadFiles.update({ where: { id: created.id }, data: { lineageId: created.id } });
    }
    return created;
  } catch (error) {
    console.error('Failed to create uploadFiles in database');
    throw error;
  }
}

export async function delUploadFileInfoById(fileId) {
  try {
    // 1. 獲取檔案資訊
    let fileInfo = await db.uploadFiles.findUnique({ where: { id: fileId } });
    if (!fileInfo) {
      throw new Error('File not found');
    }

    // 2. 獲取與檔案關聯的所有文字塊
    const chunks = await db.chunks.findMany({
      where: { fileId: fileId }
    });

    // 記錄統計資料，用於返回給前端顯示
    const chunkIds = chunks.map(chunk => chunk.id);
    const stats = {
      chunks: chunks.length,
      questions: 0,
      datasets: 0
    };

    // 3. 找出所有關聯的問題和資料集
    let questionIds = [];
    let datasets = [];

    if (chunkIds.length > 0) {
      // 統計問題數量
      const questionsCount = await db.questions.count({
        where: { chunkId: { in: chunkIds } }
      });
      stats.questions = questionsCount;

      // 獲取所有問題ID
      const questions = await db.questions.findMany({
        where: { chunkId: { in: chunkIds } },
        select: { id: true }
      });

      questionIds = questions.map(q => q.id);

      // 4. 統計資料集數量
      if (questionIds.length > 0) {
        const datasetsCount = await db.datasets.count({
          where: { questionId: { in: questionIds } }
        });
        stats.datasets = datasetsCount;

        // 獲取所有資料集
        datasets = await db.datasets.findMany({
          where: { questionId: { in: questionIds } },
          select: { id: true }
        });
      }
    }

    // 5. 清除 pgvector 向量（Prisma 無 FK，不會 cascade；先刪向量再刪 DB row）
    if (questionIds.length > 0) {
      await db.embeddings.deleteMany({ where: { sourceType: 'question', sourceId: { in: questionIds } } });
    }
    if (datasets.length > 0) {
      await db.embeddings.deleteMany({ where: { sourceType: 'answer', sourceId: { in: datasets.map(d => d.id) } } });
    }

    // 6. 使用事務批次刪除所有資料庫資料
    // 按照外部索引鍵依賴關係從外到內刪除
    const deleteOperations = [];

    // 先刪除資料集
    if (datasets.length > 0) {
      deleteOperations.push(
        db.datasets.deleteMany({
          where: { id: { in: datasets.map(d => d.id) } }
        })
      );
    }

    // 再刪除問題
    if (questionIds.length > 0) {
      deleteOperations.push(
        db.questions.deleteMany({
          where: { id: { in: questionIds } }
        })
      );
    }

    // 然後刪除文字塊
    if (chunkIds.length > 0) {
      deleteOperations.push(
        db.chunks.deleteMany({
          where: { id: { in: chunkIds } }
        })
      );
    }

    // 最後刪除檔案記錄
    deleteOperations.push(
      db.uploadFiles.delete({
        where: { id: fileId }
      })
    );

    // 執行資料庫事務，確保原子性
    await db.$transaction(deleteOperations);

    // 被刪 question 可能屬於某些 cluster，收斂 size / primary / 空 cluster
    if (questionIds.length > 0) {
      await enqueueClusterMaintenance(fileInfo.projectId);
    }

    // 7. 刪除檔案系統中的檔案
    let projectPath = path.join(fileInfo.path, fileInfo.fileName);
    if (fileInfo.fileExt !== '.md') {
      let filePath = path.join(fileInfo.path, fileInfo.fileName.replace(/\.[^/.]+$/, '.md'));
      if (fs.existsSync(filePath)) {
        await fs.promises.rm(filePath, { recursive: true });
      }
    }
    if (fs.existsSync(projectPath)) {
      await fs.promises.rm(projectPath, { recursive: true });
    }

    return { success: true, stats, fileName: fileInfo.fileName, fileInfo };
  } catch (error) {
    console.error('Failed to delete uploadFiles by id in database:', error);
    throw error;
  }
}

// 用新檔替換既有文件：建新檔 row（沿用 lineageId）→ 寫稽核記錄 → 完整清除舊文件衍生
// newFileMeta: { fileName, size, md5, fileExt, path }
export async function replaceUploadFile(oldFileId, newFileMeta) {
  const oldFile = await db.uploadFiles.findUnique({ where: { id: oldFileId } });
  if (!oldFile) throw new Error('File not found');
  const lineageId = oldFile.lineageId || oldFile.id;

  // 1. 先建新檔 row（沿用 lineageId）
  const newFile = await db.uploadFiles.create({
    data: {
      projectId: oldFile.projectId,
      fileName: newFileMeta.fileName,
      size: newFileMeta.size,
      md5: newFileMeta.md5,
      fileExt: newFileMeta.fileExt,
      path: newFileMeta.path,
      lineageId,
    },
  });

  // 2. 寫稽核記錄（append-only）
  await db.documentReplacement.create({
    data: {
      projectId: oldFile.projectId,
      lineageId,
      oldFileId: oldFile.id,
      oldFileName: oldFile.fileName,
      newFileId: newFile.id,
      newFileName: newFile.fileName,
    },
  });

  // 3. 完整清除舊文件衍生（含 Embeddings + cluster 收斂；複用補強後的刪除）
  const { stats } = await delUploadFileInfoById(oldFile.id);

  return { newFileId: newFile.id, lineageId, clearedStats: stats };
}
