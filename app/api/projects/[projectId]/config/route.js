import { NextResponse } from 'next/server';
import { getProject, updateProject, getTaskConfig } from '@/lib/db/projects';

// 獲取專案配置
export async function GET(request, { params }) {
  try {
    const projectId = params.projectId;
    const config = await getProject(projectId);
    const taskConfig = await getTaskConfig(projectId);
    return NextResponse.json({ ...config, ...taskConfig });
  } catch (error) {
    console.error('獲取專案配置失敗:', String(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 更新專案配置
export async function PUT(request, { params }) {
  try {
    const projectId = params.projectId;
    const newConfig = await request.json();
    const currentConfig = await getProject(projectId);

    // 只更新 prompts 部分
    const updatedConfig = {
      ...currentConfig,
      ...newConfig.prompts
    };

    const config = await updateProject(projectId, updatedConfig);
    return NextResponse.json(config);
  } catch (error) {
    console.error('更新專案配置失敗:', String(error));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
