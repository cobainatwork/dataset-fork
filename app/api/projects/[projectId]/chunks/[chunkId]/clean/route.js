import { NextResponse } from 'next/server';
import logger from '@/lib/util/logger';
import cleanService from '@/lib/services/clean';

// 為指定文字塊進行資料清洗
export async function POST(request, { params }) {
  try {
    const { projectId, chunkId } = params;

    // 驗證專案ID和文字塊ID
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'Project ID or text block ID cannot be empty' }, { status: 400 });
    }

    // 獲取請求體
    const { model, language = '中文' } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Model cannot be empty' }, { status: 400 });
    }

    // 使用資料清洗服務
    const result = await cleanService.cleanDataForChunk(projectId, chunkId, {
      model,
      language
    });

    // 返回清洗結果
    return NextResponse.json({
      chunkId,
      originalLength: result.originalLength,
      cleanedLength: result.cleanedLength,
      success: result.success,
      message: '資料清洗完成'
    });
  } catch (error) {
    logger.error('Error cleaning data:', error);
    return NextResponse.json({ error: error.message || 'Error cleaning data' }, { status: 500 });
  }
}
