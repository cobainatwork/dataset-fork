import { NextResponse } from 'next/server';

// 獲取預設提示詞內容
export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const promptType = searchParams.get('promptType');
    const promptKey = searchParams.get('promptKey');

    if (!promptType || !promptKey) {
      return NextResponse.json({ error: 'promptType and promptKey are required' }, { status: 400 });
    }

    // 動態匯入對應的提示詞模組
    let promptModule;
    try {
      promptModule = await import(`@/lib/llm/prompts/${promptType}`);
    } catch (error) {
      return NextResponse.json({ error: `Prompt module ${promptType} not found` }, { status: 404 });
    }

    // 獲取指定的提示詞常量
    const promptContent = promptModule[promptKey];
    if (!promptContent) {
      return NextResponse.json({ error: `Prompt key ${promptKey} not found in module ${promptType}` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      content: promptContent,
      promptType,
      promptKey
    });
  } catch (error) {
    console.error('獲取預設提示詞失敗:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
