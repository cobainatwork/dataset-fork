import { NextResponse } from 'next/server';
import { getImageDatasetById, updateImageDataset, deleteImageDataset } from '@/lib/db/imageDatasets';
import { getProjectPath } from '@/lib/db/base';
import fs from 'fs/promises';
import path from 'path';

// 獲取單個數據集詳情
export async function GET(request, { params }) {
  try {
    const { projectId, datasetId } = params;

    const dataset = await getImageDatasetById(datasetId);

    if (!dataset || dataset.projectId !== projectId) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // 獲取專案路徑
    const projectPath = await getProjectPath(projectId);

    // 讀取圖片 base64
    let base64 = null;
    try {
      const imagePath = path.join(projectPath, 'images', dataset.imageName);
      const imageBuffer = await fs.readFile(imagePath);
      const base64Data = imageBuffer.toString('base64');
      const ext = path.extname(dataset.imageName).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      base64 = `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error(`Failed to read image ${dataset.imageName}:`, error);
    }

    // 新增圖片 base64
    const datasetWithImage = {
      ...dataset,
      base64
    };

    return NextResponse.json(datasetWithImage);
  } catch (error) {
    console.error('Failed to get dataset detail:', error);
    return NextResponse.json({ error: error.message || 'Failed to get dataset detail' }, { status: 500 });
  }
}

// 更新資料集
export async function PUT(request, { params }) {
  try {
    const { projectId, datasetId } = params;
    const updates = await request.json();

    // 驗證資料集存在且屬於該專案
    const dataset = await getImageDatasetById(datasetId);
    if (!dataset || dataset.projectId !== projectId) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // 更新資料集
    const updated = await updateImageDataset(datasetId, updates);

    // 獲取專案路徑
    const projectPath = await getProjectPath(projectId);

    // 讀取圖片 base64
    let base64 = null;
    try {
      const imagePath = path.join(projectPath, 'images', updated.imageName);
      const imageBuffer = await fs.readFile(imagePath);
      const base64Data = imageBuffer.toString('base64');
      const ext = path.extname(updated.imageName).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
      base64 = `data:${mimeType};base64,${base64Data}`;
    } catch (error) {
      console.error(`Failed to read image ${updated.imageName}:`, error);
    }

    // 新增圖片 base64
    const updatedWithImage = {
      ...updated,
      base64
    };

    return NextResponse.json(updatedWithImage);
  } catch (error) {
    console.error('Failed to update dataset:', error);
    return NextResponse.json({ error: error.message || 'Failed to update dataset' }, { status: 500 });
  }
}

// 刪除資料集
export async function DELETE(request, { params }) {
  try {
    const { projectId, datasetId } = params;

    // 驗證資料集存在且屬於該專案
    const dataset = await getImageDatasetById(datasetId);
    if (!dataset || dataset.projectId !== projectId) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    await deleteImageDataset(datasetId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete dataset:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete dataset' }, { status: 500 });
  }
}
