import { NextResponse } from 'next/server';
import { batchDeleteQuestions } from '@/lib/db/questions';

// 批次刪除問題
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { questionIds } = body;

    // 驗證引數
    if (questionIds.length === 0) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 });
    }

    // 刪除問題
    await batchDeleteQuestions(questionIds);

    return NextResponse.json({ success: true, message: 'Delete successful' });
  } catch (error) {
    console.error('Delete failed:', String(error));
    return NextResponse.json({ error: error.message || 'Delete failed' }, { status: 500 });
  }
}
