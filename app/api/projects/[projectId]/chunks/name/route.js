import { NextResponse } from 'next/server';
import { getChunkByName } from '@/lib/db/chunks';

/**
 * 根據文字塊名稱獲取文字塊
 * @param {Request} request 請求物件
 * @param {object} context 上下文，包含路徑引數
 * @returns {Promise<NextResponse>} 響應物件
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 從查詢引數中獲取 chunkName
    const { searchParams } = new URL(request.url);
    const chunkName = searchParams.get('chunkName');

    if (!chunkName) {
      return NextResponse.json({ error: '文字塊名稱不能為空' }, { status: 400 });
    }

    // 根據名稱和專案ID查詢文字塊
    const chunk = await getChunkByName(projectId, chunkName);

    if (!chunk) {
      return NextResponse.json({ error: '未找到指定的文字塊' }, { status: 404 });
    }

    // 返回文字塊資訊
    return NextResponse.json(chunk);
  } catch (error) {
    console.error('根據名稱獲取文字塊失敗:', String(error));
    return NextResponse.json({ error: '獲取文字塊失敗: ' + error.message }, { status: 500 });
  }
}
