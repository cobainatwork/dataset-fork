import { NextResponse } from 'next/server';
import { distillTagsPrompt } from '@/lib/llm/prompts/distillTags';
import { db } from '@/lib/db';
import { getProject } from '@/lib/db/projects';

const LLMClient = require('@/lib/llm/core');

/**
 * 生成標籤介面：根據頂級主題、某級標籤構造指定數量的子標籤
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;

    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }

    const { parentTag, parentTagId, tagPath, count = 10, model, language = 'zh' } = await request.json();

    if (!parentTag) {
      const errorMsg = language === 'en' ? 'Topic tag name cannot be empty' : '主題標籤名稱不能為空';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    // 查詢現有標籤
    const existingTags = await db.tags.findMany({
      where: {
        projectId,
        parentId: parentTagId || null
      }
    });

    const existingTagNames = existingTags.map(tag => tag.label);

    // 建立LLM客戶端
    const llmClient = new LLMClient(model);

    // 生成提示詞
    const prompt = await distillTagsPrompt(
      language,
      { tagPath, parentTag, existingTags: existingTagNames, count },
      projectId
    );

    // 呼叫大模型生成標籤
    const { answer } = await llmClient.getResponseWithCOT(prompt);

    // 解析返回的標籤
    let tags = [];

    try {
      tags = JSON.parse(answer);
    } catch (error) {
      console.error('解析標籤JSON失敗:', String(error));
      // 嘗試使用正則表示式提取標籤
      const matches = answer.match(/"([^"]+)"/g);
      if (matches) {
        tags = matches.map(match => match.replace(/"/g, ''));
      }
    }

    // 儲存標籤到資料庫
    const savedTags = [];
    for (let i = 0; i < tags.length; i++) {
      const tagName = tags[i];
      try {
        const tag = await db.tags.create({
          data: {
            label: tagName,
            projectId,
            parentId: parentTagId || null
          }
        });
        savedTags.push(tag);
      } catch (error) {
        console.error(`[標籤生成] 儲存標籤 ${tagName} 失敗:`, String(error));
        throw error;
      }
    }
    return NextResponse.json(savedTags);
  } catch (error) {
    console.error('[標籤生成] 生成標籤失敗:', String(error));
    console.error('[標籤生成] 錯誤堆疊:', error.stack);
    return NextResponse.json({ error: error.message || '生成標籤失敗' }, { status: 500 });
  }
}
