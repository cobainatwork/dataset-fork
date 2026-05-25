import { NextResponse } from 'next/server';
import { saveChunks, deleteChunksByFileId } from '@/lib/db/chunks';
import path from 'path';
import fs from 'fs/promises';
import { getProjectRoot } from '@/lib/db/base';

/**
 * 處理自定義分塊請求
 * @param {Request} request - 請求物件
 * @param {Object} params - 路由引數
 * @returns {Promise<Response>} - 響應物件
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { fileId, fileName, content, splitPoints } = await request.json();

    // 引數驗證
    if (!projectId || !fileId || !fileName || !content || !splitPoints) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 獲取專案根目錄
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);

    // 檢查專案是否存在
    try {
      await fs.access(projectPath);
    } catch (error) {
      return NextResponse.json({ error: 'Project does not exist' }, { status: 404 });
    }

    // 先刪除該檔案已有的文字塊
    await deleteChunksByFileId(projectId, fileId);

    // 根據分塊點將檔案內容分割成多個塊
    const customChunks = generateCustomChunks(projectId, fileId, fileName, content, splitPoints);

    // 儲存新的文字塊
    await saveChunks(customChunks);

    return NextResponse.json({
      success: true,
      message: 'Custom chunks saved successfully',
      totalChunks: customChunks.length
    });
  } catch (error) {
    console.error('自定義分塊處理出錯:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to process custom split request' }, { status: 500 });
  }
}

/**
 * 根據分塊點生成自定義文字塊
 * @param {string} projectId - 專案ID
 * @param {string} fileId - 檔案ID
 * @param {string} fileName - 檔名
 * @param {string} content - 檔案內容
 * @param {Array} splitPoints - 分塊點陣列
 * @returns {Array} - 生成的文字塊陣列
 */
function generateCustomChunks(projectId, fileId, fileName, content, splitPoints) {
  // 按位置排序分塊點
  const sortedPoints = [...splitPoints].sort((a, b) => a.position - b.position);

  // 建立分塊
  const chunks = [];
  let startPos = 0;

  // 處理每個分塊點
  for (let i = 0; i < sortedPoints.length; i++) {
    const endPos = sortedPoints[i].position;

    // 提取當前分塊內容
    const chunkContent = content.substring(startPos, endPos);

    // 跳過空白分塊
    if (chunkContent.trim().length === 0) {
      startPos = endPos;
      continue;
    }

    // 建立分塊物件
    const chunk = {
      projectId,
      name: `${path.basename(fileName, path.extname(fileName))}-part-${i + 1}`,
      fileId,
      fileName,
      content: chunkContent,
      summary: `${fileName} 自定義分塊 ${i + 1}/${sortedPoints.length + 1}`,
      size: chunkContent.length
    };

    chunks.push(chunk);
    startPos = endPos;
  }

  // 新增最後一個分塊（如果有內容）
  const lastChunkContent = content.substring(startPos);
  if (lastChunkContent.trim().length > 0) {
    const lastChunk = {
      projectId,
      name: `${path.basename(fileName, path.extname(fileName))}-part-${sortedPoints.length + 1}`,
      fileId,
      fileName,
      content: lastChunkContent,
      summary: `${fileName} 自定義分塊 ${sortedPoints.length + 1}/${sortedPoints.length + 1}`,
      size: lastChunkContent.length
    };

    chunks.push(lastChunk);
  }

  return chunks;
}
