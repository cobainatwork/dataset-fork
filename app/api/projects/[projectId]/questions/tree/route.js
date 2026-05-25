import { NextResponse } from 'next/server';
import { getQuestionsForTree, getQuestionsByTag } from '@/lib/db/questions';

/**
 * 獲取專案的問題樹形檢視資料
 * @param {Request} request - 請求物件
 * @param {Object} params - 路由引數
 * @returns {Promise<Response>} - 包含問題資料的響應
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const input = searchParams.get('input');
    const tagsOnly = searchParams.get('tagsOnly') === 'true';
    const isDistill = searchParams.get('isDistill') === 'true';
    // 預設排除圖片問題（label='image'），可透過 excludeImage=false 引數改變
    const excludeImage = searchParams.get('excludeImage') !== 'false';

    if (tag) {
      // 獲取指定標籤的問題資料（包含完整欄位）
      const questions = await getQuestionsByTag(projectId, tag, input, isDistill, excludeImage);
      return NextResponse.json(questions);
    } else if (tagsOnly) {
      // 只獲取標籤資訊（僅包含 id 和 label 欄位）
      const treeData = await getQuestionsForTree(projectId, input, isDistill, excludeImage);
      return NextResponse.json(treeData);
    } else {
      // 相容原有請求，獲取樹形檢視資料（僅包含 id 和 label 欄位）
      const treeData = await getQuestionsForTree(projectId, null, isDistill, excludeImage);
      return NextResponse.json(treeData);
    }
  } catch (error) {
    console.error('獲取問題樹形資料失敗:', String(error));
    return NextResponse.json({ error: error.message || '獲取問題樹形資料失敗' }, { status: 500 });
  }
}
