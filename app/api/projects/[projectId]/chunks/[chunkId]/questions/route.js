import { NextResponse } from 'next/server';
import { getQuestionsForChunk } from '@/lib/db/questions';
import logger from '@/lib/util/logger';
import questionService from '@/lib/services/questions';

// 為指定文字塊生成問題
export async function POST(request, { params }) {
  try {
    const { projectId, chunkId } = params;

    // 驗證專案ID和文字塊ID
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'Project ID or text block ID cannot be empty' }, { status: 400 });
    } // 獲取請求體
    const { model, language = '中文', number, enableGaExpansion = false } = await request.json();

    if (!model) {
      return NextResponse.json({ error: 'Model cannot be empty' }, { status: 400 });
    }

    // 後續會根據是否有GA對來選擇是否啟用GA擴充套件選擇服務函式
    const serviceFunc = questionService.generateQuestionsForChunkWithGA;

    // 使用問題生成服務
    const result = await serviceFunc(projectId, chunkId, {
      model,
      language,
      number,
      enableGaExpansion
    });

    // 統一返回格式，確保包含GA擴充套件資訊
    const response = {
      chunkId,
      questions: result.questions || result.labelQuestions || [],
      total: result.total || (result.questions || result.labelQuestions || []).length,
      gaExpansionUsed: result.gaExpansionUsed || false,
      gaPairsCount: result.gaPairsCount || 0,
      expectedTotal: result.expectedTotal || result.total
    };

    // 返回生成的問題
    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error generating questions:', error);
    return NextResponse.json({ error: error.message || 'Error generating questions' }, { status: 500 });
  }
}

// 獲取指定文字塊的問題
export async function GET(request, { params }) {
  try {
    const { projectId, chunkId } = params;

    // 驗證專案ID和文字塊ID
    if (!projectId || !chunkId) {
      return NextResponse.json({ error: 'The item ID or text block ID cannot be empty' }, { status: 400 });
    }

    // 獲取文字塊的問題
    const questions = await getQuestionsForChunk(projectId, chunkId);

    // 返回問題列表
    return NextResponse.json({
      chunkId,
      questions,
      total: questions.length
    });
  } catch (error) {
    console.error('Error getting questions:', String(error));
    return NextResponse.json({ error: error.message || 'Error getting questions' }, { status: 500 });
  }
}
