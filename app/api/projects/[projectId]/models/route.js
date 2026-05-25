import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getProjectRoot } from '@/lib/db/base';

// 獲取模型配置
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案 ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }

    // 獲取專案根目錄
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);

    // 檢查專案是否存在
    try {
      await fs.access(projectPath);
    } catch (error) {
      return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
    }

    // 獲取模型配置檔案路徑
    const modelConfigPath = path.join(projectPath, 'model-config.json');

    // 檢查模型配置檔案是否存在
    try {
      await fs.access(modelConfigPath);
    } catch (error) {
      // 如果配置檔案不存在，返回預設配置
      return NextResponse.json([]);
    }

    // 讀取模型配置檔案
    const modelConfigData = await fs.readFile(modelConfigPath, 'utf-8');
    const modelConfig = JSON.parse(modelConfigData);

    return NextResponse.json(modelConfig);
  } catch (error) {
    console.error('Error obtaining model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to obtain model configuration' }, { status: 500 });
  }
}

// 更新模型配置
export async function PUT(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案 ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }

    // 獲取請求體
    const modelConfig = await request.json();

    // 驗證請求體
    if (!modelConfig || !Array.isArray(modelConfig)) {
      return NextResponse.json({ error: 'The model configuration must be an array' }, { status: 400 });
    }

    // 獲取專案根目錄
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);

    // 檢查專案是否存在
    try {
      await fs.access(projectPath);
    } catch (error) {
      return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
    }

    // 獲取模型配置檔案路徑
    const modelConfigPath = path.join(projectPath, 'model-config.json');

    // 寫入模型配置檔案
    await fs.writeFile(modelConfigPath, JSON.stringify(modelConfig, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Model configuration updated successfully' });
  } catch (error) {
    console.error('Error updating model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to update model configuration' }, { status: 500 });
  }
}
