/**
 * 多輪對話資料集匯出API
 * 直接匯出原始的 ShareGPT 格式資料集
 */

import { NextResponse } from 'next/server';
import { getAllDatasetConversations } from '@/lib/db/dataset-conversations';

/**
 * 匯出多輪對話資料集
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    // 篩選條件
    const filters = {
      confirmed: searchParams.get('confirmed')
    };

    // 清除空值
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    // 獲取所有對話資料集
    const conversations = await getAllDatasetConversations(projectId, filters);

    if (conversations.length === 0) {
      return NextResponse.json([]);
    }

    // 轉換為 ShareGPT 格式陣列
    const shareGptData = [];

    for (const conversation of conversations) {
      try {
        // 解析 rawMessages
        const messages = JSON.parse(conversation.rawMessages || '[]');

        if (messages.length > 0) {
          // 構建 ShareGPT 格式物件
          const shareGptItem = {
            messages: messages
          };

          shareGptData.push(shareGptItem);
        }
      } catch (error) {
        console.error(`解析對話訊息失敗 ${conversation.id}:`, error);
        // 跳過解析失敗的對話，繼續處理其他對話
        continue;
      }
    }

    return NextResponse.json(shareGptData);
  } catch (error) {
    console.error('匯出多輪對話資料集失敗:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}
