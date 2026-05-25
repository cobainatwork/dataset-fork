/**
 * 單個多輪對話資料集操作API
 */

import { NextResponse } from 'next/server';
import {
  getDatasetConversationById,
  updateDatasetConversation,
  deleteDatasetConversation,
  getConversationNavigationItems
} from '@/lib/db/dataset-conversations';

/**
 * 獲取單個多輪對話資料集詳情
 */
export async function GET(request, { params }) {
  try {
    const { projectId, conversationId } = params;
    const { searchParams } = new URL(request.url);
    const operateType = searchParams.get('operateType');

    // 如果是導航操作，返回導航項
    if (operateType !== null) {
      const data = await getConversationNavigationItems(projectId, conversationId, operateType);
      return NextResponse.json(data);
    }

    const conversation = await getDatasetConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: '對話資料集不存在'
        },
        { status: 404 }
      );
    }

    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: '對話資料集不屬於指定專案'
        },
        { status: 403 }
      );
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('獲取多輪對話資料集詳情失敗:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * 更新多輪對話資料集
 */
export async function PUT(request, { params }) {
  try {
    const { projectId, conversationId } = params;
    const body = await request.json();

    // 驗證對話資料集是否存在且屬於專案
    const conversation = await getDatasetConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: '對話資料集不存在'
        },
        { status: 404 }
      );
    }

    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: '對話資料集不屬於指定專案'
        },
        { status: 403 }
      );
    }

    // 只允許更新特定欄位
    const allowedFields = ['score', 'tags', 'note', 'confirmed', 'aiEvaluation', 'messages'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (body.hasOwnProperty(field)) {
        if (field === 'messages') {
          // 將messages陣列轉換為rawMessages字串儲存
          updateData['rawMessages'] = JSON.stringify(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    });

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: '沒有有效的更新欄位'
        },
        { status: 400 }
      );
    }

    const updatedConversation = await updateDatasetConversation(conversationId, updateData);

    return NextResponse.json({
      success: true,
      data: updatedConversation
    });
  } catch (error) {
    console.error('更新多輪對話資料集失敗:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * 刪除多輪對話資料集
 */
export async function DELETE(request, { params }) {
  try {
    const { projectId, conversationId } = params;

    // 驗證對話資料集是否存在且屬於專案
    const conversation = await getDatasetConversationById(conversationId);

    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          message: '對話資料集不存在'
        },
        { status: 404 }
      );
    }

    if (conversation.projectId !== projectId) {
      return NextResponse.json(
        {
          success: false,
          message: '對話資料集不屬於指定專案'
        },
        { status: 403 }
      );
    }

    await deleteDatasetConversation(conversationId);

    return NextResponse.json({
      success: true,
      message: '刪除成功'
    });
  } catch (error) {
    console.error('刪除多輪對話資料集失敗:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}
