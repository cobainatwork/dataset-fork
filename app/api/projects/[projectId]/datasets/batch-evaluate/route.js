/**
 * 批次資料集評估任務API
 * 建立批次評估資料集品質的非同步任務
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index';
import { processTask } from '@/lib/services/tasks/index';

/**
 * 建立批次資料集評估任務
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { model, language = 'zh-CN' } = await request.json();

    if (!projectId) {
      return NextResponse.json({ success: false, message: '專案ID不能為空' }, { status: 400 });
    }

    if (!model || !model.modelId) {
      return NextResponse.json({ success: false, message: '模型配置不能為空' }, { status: 400 });
    }

    // 建立批次評估任務
    const newTask = await db.task.create({
      data: {
        projectId,
        taskType: 'dataset-evaluation',
        status: 0, // 初始狀態: 處理中
        modelInfo: JSON.stringify(model),
        language: language || 'zh-CN',
        detail: '',
        totalCount: 0,
        note: '準備開始批次評估資料集品質...',
        completedCount: 0
      }
    });

    // 非同步處理任務
    processTask(newTask.id).catch(err => {
      console.error(`批次評估任務啟動失敗: ${newTask.id}`, String(err));
    });

    return NextResponse.json({
      success: true,
      message: '批次評估任務已建立',
      data: { taskId: newTask.id }
    });
  } catch (error) {
    console.error('建立批次評估任務失敗:', error);
    return NextResponse.json({ success: false, message: `建立任務失敗: ${error.message}` }, { status: 500 });
  }
}
