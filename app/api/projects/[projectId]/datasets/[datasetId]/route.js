import { NextResponse } from 'next/server';
import { getDatasetsById, getDatasetsCounts, getNavigationItems, updateDatasetMetadata } from '@/lib/db/datasets';

/**
 * 獲取專案的所有資料集
 */
export async function GET(request, { params }) {
  try {
    const { projectId, datasetId } = params;
    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }
    if (!datasetId) {
      return NextResponse.json({ error: '資料集ID不能為空' }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const operateType = searchParams.get('operateType');
    if (operateType !== null) {
      const status = searchParams.get('status');
      let confirmed = undefined;
      if (status === 'confirmed') confirmed = true;
      if (status === 'unconfirmed') confirmed = false;
      const filters = {
        confirmed,
        input: searchParams.get('input') || '',
        field: searchParams.get('field') || 'question',
        hasCot: searchParams.get('hasCot') || 'all',
        isDistill: searchParams.get('isDistill') || 'all',
        scoreRange: searchParams.get('scoreRange') || '',
        customTag: searchParams.get('customTag') || '',
        noteKeyword: searchParams.get('noteKeyword') || '',
        chunkName: searchParams.get('chunkName') || ''
      };
      const data = await getNavigationItems(projectId, datasetId, operateType, filters);
      return NextResponse.json(data);
    }
    const datasets = await getDatasetsById(datasetId);
    let counts = await getDatasetsCounts(projectId);

    return NextResponse.json({ datasets, ...counts });
  } catch (error) {
    console.error('獲取資料集詳情失敗:', String(error));
    return NextResponse.json(
      {
        error: error.message || '獲取資料集詳情失敗'
      },
      { status: 500 }
    );
  }
}

/**
 * 更新資料集元資料（評分、標籤、備註）
 */
export async function PATCH(request, { params }) {
  try {
    const { projectId, datasetId } = params;

    // 驗證引數
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }
    if (!datasetId) {
      return NextResponse.json({ error: '資料集ID不能為空' }, { status: 400 });
    }

    const body = await request.json();
    const { score, tags, note } = body;

    // 驗證評分範圍
    if (score !== undefined && (score < 0 || score > 5)) {
      return NextResponse.json({ error: '評分必須在0-5之間' }, { status: 400 });
    }

    // 驗證標籤格式
    if (tags !== undefined && !Array.isArray(tags)) {
      return NextResponse.json({ error: '標籤必須是陣列格式' }, { status: 400 });
    }

    // 更新資料集元資料
    const updatedDataset = await updateDatasetMetadata(datasetId, { score, tags, note });

    return NextResponse.json({
      success: true,
      dataset: updatedDataset
    });
  } catch (error) {
    console.error('更新資料集元資料失敗:', String(error));
    return NextResponse.json(
      {
        error: error.message || '更新資料集元資料失敗'
      },
      { status: 500 }
    );
  }
}
