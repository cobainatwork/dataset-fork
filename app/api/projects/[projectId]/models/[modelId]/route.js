import { NextResponse } from 'next/server';
import { getProjectRoot } from '@/lib/db/base';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request, { params }) {
  try {
    const { projectId, modelId } = params;

    // 驗證專案ID和模型ID
    if (!projectId || !modelId) {
      return NextResponse.json({ error: 'The project ID and model ID cannot be empty' }, { status: 400 });
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
      return NextResponse.json({ error: 'The model configuration does not exist' }, { status: 404 });
    }

    // 讀取模型配置檔案
    const modelConfigData = await fs.readFile(modelConfigPath, 'utf-8');
    const modelConfig = JSON.parse(modelConfigData);

    // 查詢指定ID的模型
    const model = modelConfig.find(model => model.id === modelId);

    if (!model) {
      return NextResponse.json({ error: 'The model does not exist' }, { status: 404 });
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error('Error getting model:', String(error));
    return NextResponse.json({ error: 'Failed to get model' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { projectId, modelId } = params;

    // 驗證專案ID和模型ID
    if (!projectId || !modelId) {
      return NextResponse.json({ error: 'The project ID and model ID cannot be empty' }, { status: 400 });
    }

    // 獲取請求體
    const modelData = await request.json();

    // 驗證請求體
    if (!modelData || !modelData.provider || !modelData.name) {
      return NextResponse.json({ error: 'The model data is incomplete' }, { status: 400 });
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

    // 讀取模型配置檔案
    let modelConfig = [];
    try {
      const modelConfigData = await fs.readFile(modelConfigPath, 'utf-8');
      modelConfig = JSON.parse(modelConfigData);
    } catch (error) {
      // 如果檔案不存在，建立一個空陣列
    }

    // 更新模型資料
    const modelIndex = modelConfig.findIndex(model => model.id === modelId);

    if (modelIndex >= 0) {
      // 更新現有模型
      modelConfig[modelIndex] = {
        ...modelConfig[modelIndex],
        ...modelData,
        id: modelId // 確保ID不變
      };
    } else {
      // 新增新模型
      modelConfig.push({
        ...modelData,
        id: modelId
      });
    }

    // 寫入模型配置檔案
    await fs.writeFile(modelConfigPath, JSON.stringify(modelConfig, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Model configuration updated successfully' });
  } catch (error) {
    console.error('Error updating model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to update model configuration' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { projectId, modelId } = params;

    // 驗證專案ID和模型ID
    if (!projectId || !modelId) {
      return NextResponse.json({ error: 'The project ID and model ID cannot be empty' }, { status: 400 });
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
      return NextResponse.json({ error: 'The model configuration does not exist' }, { status: 404 });
    }

    // 讀取模型配置檔案
    const modelConfigData = await fs.readFile(modelConfigPath, 'utf-8');
    let modelConfig = JSON.parse(modelConfigData);

    // 過濾掉要刪除的模型
    const initialLength = modelConfig.length;
    modelConfig = modelConfig.filter(model => model.id !== modelId);

    // 檢查是否找到並刪除了模型
    if (modelConfig.length === initialLength) {
      return NextResponse.json({ error: 'The model does not exist' }, { status: 404 });
    }

    // 寫入模型配置檔案
    await fs.writeFile(modelConfigPath, JSON.stringify(modelConfig, null, 2), 'utf-8');

    return NextResponse.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting model:', String(error));
    return NextResponse.json({ error: 'Failed to delete model' }, { status: 500 });
  }
}
