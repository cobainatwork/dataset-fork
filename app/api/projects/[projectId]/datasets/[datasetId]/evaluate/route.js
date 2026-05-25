import { NextResponse } from 'next/server';
import { evaluateDataset } from '@/lib/services/datasets/evaluation';

/**
 * 評估單個數據集的品質
 */
export async function POST(request, { params }) {
  try {
    const { projectId, datasetId } = params;
    const { model, language = 'zh-CN' } = await request.json();

    if (!projectId || !datasetId) {
      return NextResponse.json({ success: false, message: '專案ID和資料集ID不能為空' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ success: false, message: '模型配置不能為空' }, { status: 400 });
    }

    // 使用評估服務進行資料集評估
    const result = await evaluateDataset(projectId, datasetId, model, language);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '資料集評估完成',
      data: result.data
    });
  } catch (error) {
    console.error('資料集評估失敗:', error);
    return NextResponse.json({ success: false, message: `評估失敗: ${error.message}` }, { status: 500 });
  }
}
