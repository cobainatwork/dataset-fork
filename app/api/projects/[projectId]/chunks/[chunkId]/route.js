import { NextResponse } from 'next/server';
import { deleteChunkById, getChunkById, updateChunkById } from '@/lib/db/chunks';

// 獲取文字塊內容
export async function GET(request, { params }) {
  try {
    const { projectId, chunkId } = params;
    // 驗證引數
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }
    if (!chunkId) {
      return NextResponse.json({ error: 'Text block ID cannot be empty' }, { status: 400 });
    }
    // 獲取文字塊內容
    const chunk = await getChunkById(chunkId);

    return NextResponse.json(chunk);
  } catch (error) {
    console.error('Failed to get text block content:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to get text block content' }, { status: 500 });
  }
}

// 刪除文字塊
export async function DELETE(request, { params }) {
  try {
    const { projectId, chunkId } = params;
    // 驗證引數
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID cannot be empty' }, { status: 400 });
    }
    if (!chunkId) {
      return NextResponse.json({ error: 'Text block ID cannot be empty' }, { status: 400 });
    }
    await deleteChunkById(chunkId);

    return NextResponse.json({ message: 'Text block deleted successfully' });
  } catch (error) {
    console.error('Failed to delete text block:', String(error));
    return NextResponse.json({ error: error.message || 'Failed to delete text block' }, { status: 500 });
  }
}

// 編輯文字塊內容
export async function PATCH(request, { params }) {
  try {
    const { projectId, chunkId } = params;

    // 驗證引數
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }

    if (!chunkId) {
      return NextResponse.json({ error: '文字塊ID不能為空' }, { status: 400 });
    }

    // 解析請求體獲取新內容
    const requestData = await request.json();
    const { content } = requestData;

    if (!content) {
      return NextResponse.json({ error: '內容不能為空' }, { status: 400 });
    }

    let res = await updateChunkById(chunkId, { content });
    return NextResponse.json(res);
  } catch (error) {
    console.error('編輯文字塊失敗:', String(error));
    return NextResponse.json({ error: error.message || '編輯文字塊失敗' }, { status: 500 });
  }
}
