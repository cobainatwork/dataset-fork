import { NextResponse } from 'next/server';
import { generateEvalQuestionsForChunk } from '@/lib/services/eval';
import logger from '@/lib/util/logger';

/**
 * 為指定文字塊生成測評題目
 */
export async function POST(request, { params }) {
  try {
    const { projectId, chunkId } = params;

    // 驗證引數
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'Project ID and Chunk ID are required' }, { status: 400 });
    }

    // 獲取請求體
    const { model, language = 'zh-TW' } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Model configuration is required' }, { status: 400 });
    }

    // 呼叫服務層生成測評題目
    const result = await generateEvalQuestionsForChunk(projectId, chunkId, {
      model,
      language
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error generating eval questions:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate eval questions' }, { status: 500 });
  }
}
