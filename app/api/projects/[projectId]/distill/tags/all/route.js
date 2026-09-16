import { NextResponse } from 'next/server';
import { listTags } from '@/lib/db/tags';

/**
 * 獲取專案的所有蒸餾標籤
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }

    // 獲取所有標籤
    const tags = await listTags(projectId);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('獲取蒸餾標籤失敗:', String(error));
    return NextResponse.json({ error: error.message || '獲取蒸餾標籤失敗' }, { status: 500 });
  }
}
