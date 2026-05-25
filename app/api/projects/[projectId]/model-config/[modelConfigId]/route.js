import { NextResponse } from 'next/server';
import { deleteModelConfigById } from '@/lib/db/model-config';

// 刪除模型配置
export async function DELETE(request, { params }) {
  try {
    const { projectId, modelConfigId } = params;
    // 驗證專案 ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }
    await deleteModelConfigById(modelConfigId);
    return NextResponse.json(true);
  } catch (error) {
    console.error('Error obtaining model configuration:', String(error));
    return NextResponse.json({ error: 'Failed to obtain model configuration' }, { status: 500 });
  }
}
