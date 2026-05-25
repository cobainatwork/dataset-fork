import { NextResponse } from 'next/server';
import { getDatasetsById } from '@/lib/db/datasets';
import LLMClient from '@/lib/llm/core/index';
import { getEvalQuestionPrompt } from '@/lib/llm/prompts/evalQuestion';
import { extractJsonFromLLMOutput } from '@/lib/llm/common/util';

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { datasetId, model, language, questionType = 'open_ended', count = 1 } = await request.json();

    if (!datasetId || !model) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. 獲取原資料集
    const dataset = await getDatasetsById(datasetId);
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    // 2. 構建提示詞
    // 將原問題和答案合併作為上下文文字
    const text = `Question: ${dataset.question}\nAnswer: ${dataset.answer}`;

    const prompt = await getEvalQuestionPrompt(language || 'zh-CN', questionType, { text, number: count }, projectId);

    // 3. 呼叫 LLM
    const client = new LLMClient(model);

    const response = await client.getResponse(prompt);
    const result = extractJsonFromLLMOutput(response);

    // 結果應該是一個數組
    if (!result || !Array.isArray(result)) {
      throw new Error('Failed to parse LLM output or output is not an array');
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Generate eval variant failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
