/**
 * 多輪對話資料集管理API
 */

import { NextResponse } from 'next/server';
import {
  getDatasetConversationsByPagination,
  getAllDatasetConversationIds,
  createDatasetConversation
} from '@/lib/db/dataset-conversations';
import { generateMultiTurnConversation } from '@/lib/services/multi-turn/index';

/**
 * 獲取多輪對話資料集列表（支援分頁和篩選）
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);

    const getAllIds = searchParams.get('getAllIds') === 'true'; // 新增：獲取所有對話ID的標誌

    // 篩選條件
    const filters = {
      keyword: searchParams.get('keyword'),
      roleA: searchParams.get('roleA'),
      roleB: searchParams.get('roleB'),
      scenario: searchParams.get('scenario'),
      scoreMin: searchParams.get('scoreMin'),
      scoreMax: searchParams.get('scoreMax'),
      confirmed: searchParams.get('confirmed')
    };

    // 清除空值
    Object.keys(filters).forEach(key => {
      if (!filters[key]) delete filters[key];
    });

    // 如果請求獲取所有ID
    if (getAllIds) {
      const allConversationIds = await getAllDatasetConversationIds(projectId, filters);
      return NextResponse.json({ allConversationIds });
    }

    // 正常分頁查詢
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const result = await getDatasetConversationsByPagination(projectId, page, pageSize, filters);

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('獲取多輪對話資料集失敗:', error);
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
 * 建立多輪對話資料集
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    const { questionId, systemPrompt, scenario, rounds, roleA, roleB, model, language = '中文' } = body;

    if (!questionId) {
      return NextResponse.json(
        {
          success: false,
          message: '問題ID不能為空'
        },
        { status: 400 }
      );
    }

    if (!model || !model.modelId) {
      return NextResponse.json(
        {
          success: false,
          message: '模型配置不能為空'
        },
        { status: 400 }
      );
    }

    // 構建配置
    const config = {
      systemPrompt: systemPrompt || '',
      scenario: scenario || '',
      rounds: rounds || 3,
      roleA: roleA || '使用者',
      roleB: roleB || '助手',
      model,
      language
    };

    // 生成多輪對話
    const result = await generateMultiTurnConversation(projectId, questionId, config);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('建立多輪對話資料集失敗:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}
