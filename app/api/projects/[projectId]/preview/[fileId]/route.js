import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProjectRoot } from '@/lib/db/base';
import { getUploadFileInfoById } from '@/lib/db/upload-files';

// 獲取檔案內容
export async function GET(request, { params }) {
  try {
    const { projectId, fileId } = params;

    // 驗證引數
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }

    // 獲取專案根目錄
    let fileInfo = await getUploadFileInfoById(fileId);
    if (!fileInfo) {
      return NextResponse.json({ error: 'file does not exist' }, { status: 400 });
    }

    // 獲取檔案路徑
    let filePath = path.join(fileInfo.path, fileInfo.fileName);
    if (fileInfo.fileExt !== '.md') {
      filePath = path.join(fileInfo.path, fileInfo.fileName.replace(/\.[^/.]+$/, '.md'));
    }
    //獲取檔案
    const buffer = fs.readFileSync(filePath);

    const text = buffer.toString('utf-8');

    return NextResponse.json({
      fileId: fileId,
      fileName: fileInfo.fileName,
      content: text
    });
  } catch (error) {
    console.error('Failed to get text block content:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get text block content' }, { status: 500 });
  }
}
