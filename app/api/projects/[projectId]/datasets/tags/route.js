import { NextResponse } from 'next/server';
import { getUsedCustomTags } from '@/lib/db/datasets';

/**
 * 獲取專案中使用過的自定義標籤
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }

    const tags = await getUsedCustomTags(projectId);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('獲取自定義標籤失敗:', String(error));
    return NextResponse.json(
      {
        error: error.message || '獲取自定義標籤失敗'
      },
      { status: 500 }
    );
  }
}
