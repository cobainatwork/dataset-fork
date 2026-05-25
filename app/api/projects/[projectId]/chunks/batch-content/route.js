import { getChunkContentsByNames } from '@/lib/db/chunks';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { chunkNames } = await request.json();

    if (!chunkNames || !Array.isArray(chunkNames)) {
      return NextResponse.json({ error: 'chunkNames 引數必須是陣列' }, { status: 400 });
    }

    const chunkContentMap = await getChunkContentsByNames(projectId, chunkNames);

    return NextResponse.json(chunkContentMap);
  } catch (error) {
    console.error('批次獲取文字塊內容失敗:', error);
    return NextResponse.json({ error: '批次獲取文字塊內容失敗' }, { status: 500 });
  }
}
