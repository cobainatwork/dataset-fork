'use server';

import fs from 'fs';
import path from 'path';
import { getProjectRoot, ensureDir } from './base';

// 獲取專案中所有原始檔案
export async function getFiles(projectId) {
  const projectRoot = await getProjectRoot();
  const projectPath = path.join(projectRoot, projectId);
  const filesDir = path.join(projectPath, 'files');
  await fs.promises.access(filesDir);
  const files = await fs.promises.readdir(filesDir);
  const fileStats = await Promise.all(
    files.map(async fileName => {
      // 跳過非檔案專案
      const filePath = path.join(filesDir, fileName);
      const stats = await fs.promises.stat(filePath);

      // 只返回Markdown檔案，跳過其他檔案
      if (!fileName.endsWith('.md')) {
        return null;
      }

      return {
        name: fileName,
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime
      };
    })
  );
  return fileStats.filter(Boolean); // 過濾掉null值
}

// 刪除專案中的原始檔案及相關的文字塊
export async function deleteFile(projectId, fileName) {
  const projectRoot = await getProjectRoot();
  const projectPath = path.join(projectRoot, projectId);
  const filesDir = path.join(projectPath, 'files');
  const chunksDir = path.join(projectPath, 'chunks');
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
  const tocPath = path.join(tocDir, `${baseName}-toc.json`);
  try {
    await fs.promises.access(tocPath);
    await fs.promises.unlink(tocPath);
  } catch (error) {
    // 如果TOC檔案不存在，繼續處理
  }

  // 刪除相關的文字塊
  try {
    await fs.promises.access(chunksDir);
    const chunks = await fs.promises.readdir(chunksDir);

    // 過濾出與該檔案相關的文字塊
    const relatedChunks = chunks.filter(chunk => chunk.startsWith(`${baseName}-part-`) && chunk.endsWith('.txt'));

    // 刪除相關的文字塊
    for (const chunk of relatedChunks) {
      const chunkPath = path.join(chunksDir, chunk);
      await fs.promises.unlink(chunkPath);
    }
  } catch (error) {
    console.error(`刪除檔案 ${fileName} 相關的文字塊失敗:`, error);
  }

  return { success: true, fileName };
}
