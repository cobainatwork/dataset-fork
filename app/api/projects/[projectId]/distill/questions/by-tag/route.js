import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * 根據標籤ID獲取問題列表
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    // 驗證引數
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }

    if (!tagId) {
      return NextResponse.json({ error: '標籤ID不能為空' }, { status: 400 });
    }

    // 獲取標籤資訊
    const tag = await db.tags.findUnique({
      where: { id: tagId }
    });

    if (!tag) {
      return NextResponse.json({ error: '標籤不存在' }, { status: 404 });
    }

    // 獲取或建立蒸餾文字塊
    let distillChunk = await db.chunks.findFirst({
      where: {
        projectId,
        name: 'Distilled Content'
      }
    });

    if (!distillChunk) {
      // 建立一個特殊的蒸餾文字塊
      distillChunk = await db.chunks.create({
        data: {
          name: 'Distilled Content',
          projectId,
          fileId: 'distilled',
          fileName: 'distilled.md',
          content:
            'This text block is used to store questions generated through data distillation and is not related to actual literature.',
          summary: 'Questions generated through data distillation',
          size: 0
        }
      });
    }
    const questions = await db.questions.findMany({
      where: {
        projectId,
        label: tag.label,
        chunkId: distillChunk.id
      }
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('[distill/questions/by-tag] 獲取問題失敗:', String(error));
    return NextResponse.json({ error: error.message || '獲取問題失敗' }, { status: 500 });
  }
}
