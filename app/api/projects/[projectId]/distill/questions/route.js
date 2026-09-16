import { NextResponse } from 'next/server';
import { distillQuestionsPrompt } from '@/lib/llm/prompts/distillQuestions';
import { ensureDistillChunk } from '@/lib/db/chunks';
import { findQuestions, createQuestion } from '@/lib/db/questions';

const LLMClient = require('@/lib/llm/core');

/**
 * 生成問題介面：根據某個標籤鏈路構造指定數量的問題
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }

    const { tagPath, currentTag, tagId, count = 5, model, language = 'zh' } = await request.json();

    if (!currentTag || !tagPath) {
      const errorMsg = language === 'en' ? 'Tag information cannot be empty' : '標籤資訊不能為空';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // 首先獲取或建立蒸餾文字塊
    const distillChunk = await ensureDistillChunk(projectId);

    // 獲取已有的問題，避免重複
    const existingQuestions = await findQuestions({
      where: {
        projectId,
        label: currentTag,
        chunkId: distillChunk.id // 使用蒸餾文字塊的 ID
      },
      select: { question: true }
    });

    const existingQuestionTexts = existingQuestions.map(q => q.question);

    const llmClient = new LLMClient(model);
    const prompt = await distillQuestionsPrompt(
      language,
      { tagPath, currentTag, count, existingQuestionTexts },
      projectId
    );
    const { answer } = await llmClient.getResponseWithCOT(prompt);

    let questions = [];
    try {
      questions = JSON.parse(answer);
    } catch (error) {
      console.error('解析問題JSON失敗:', String(error));
      // 嘗試使用正則表示式提取問題
      const matches = answer.match(/"([^"]+)"/g);
      if (matches) {
        questions = matches.map(match => match.replace(/"/g, ''));
      }
    }

    // 儲存問題到資料庫
    const savedQuestions = [];
    for (const questionText of questions) {
      const question = await createQuestion({
        question: questionText,
        projectId,
        label: currentTag,
        chunkId: distillChunk.id
      });
      savedQuestions.push(question);
    }

    return NextResponse.json(savedQuestions);
  } catch (error) {
    console.error('生成問題失敗:', String(error));
    return NextResponse.json({ error: error.message || '生成問題失敗' }, { status: 500 });
  }
}
