import { NextResponse } from 'next/server';
import { getImageDatasetsForExport } from '@/lib/db/imageDatasets';

/**
 * 匯出影像資料集
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }

    const confirmedOnly = body.confirmedOnly || false;

    // 獲取資料集
    const datasets = await getImageDatasetsForExport(projectId, confirmedOnly);

    return NextResponse.json(datasets);
  } catch (error) {
    console.error('Failed to export image datasets:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to export image datasets'
      },
      { status: 500 }
    );
  }
}
