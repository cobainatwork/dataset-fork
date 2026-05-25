import { NextResponse } from 'next/server';
import { getImages, deleteImage, getImageDetail } from '@/lib/db/images';
import { getProjectPath } from '@/lib/db/base';
import { db } from '@/lib/db/index';
import { importImagesFromDirectories } from '@/lib/services/images';
import fs from 'fs/promises';
import path from 'path';

// 獲取圖片列表
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 20;
    const imageName = searchParams.get('imageName') || '';
    const hasQuestions = searchParams.get('hasQuestions');
    const hasDatasets = searchParams.get('hasDatasets');
    const simple = searchParams.get('simple');

    const result = await getImages(projectId, page, pageSize, imageName, hasQuestions, hasDatasets, simple);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get images:', error);
    return NextResponse.json({ error: error.message || 'Failed to get images' }, { status: 500 });
  }
}

// 匯入圖片
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { directories } = await request.json();

    // 呼叫服務層處理圖片匯入
    const result = await importImagesFromDirectories(projectId, directories);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to import images:', error);
    return NextResponse.json({ error: error.message || 'Failed to import images' }, { status: 500 });
  }
}

// 刪除圖片
export async function DELETE(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: '缺少圖片ID' }, { status: 400 });
    }

    // 獲取圖片資訊
    const image = await getImageDetail(imageId);

    if (!image) {
      return NextResponse.json({ error: '圖片不存在' }, { status: 404 });
    }

    // 刪除關聯的資料集
    await db.imageDatasets.deleteMany({
      where: { imageId }
    });

    // 刪除關聯的問題
    await db.questions.deleteMany({
      where: { imageId }
    });

    // 刪除檔案
    const projectPath = await getProjectPath(projectId);
    const filePath = path.join(projectPath, 'images', image.imageName);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn('刪除檔案失敗:', err);
    }

    // 刪除資料庫記錄
    await deleteImage(imageId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete image:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete image' }, { status: 500 });
  }
}
