import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();
    const { format, selectedIds, filters } = body;

    let questions;

    // 如果有選中的問題 ID，按 ID 獲取
    if (selectedIds && selectedIds.length > 0) {
      questions = await getQuestionsByIds(projectId, selectedIds);
    } else {
      // 否則獲取全部問題（不限分頁）
      questions = await getAllQuestions(
        projectId,
        filters?.searchTerm || '',
        filters?.chunkName || '',
        filters?.sourceType || 'all'
      );
    }

    // 固定匯出欄位：問題內容、文字塊名稱、問題標籤
    const filteredQuestions = questions.map(q => ({
      question: q.question,
      chunkName: q.chunk?.name || q.chunkName || '',
      questionLabel: q.questionLabel || ''
    }));

    return NextResponse.json(filteredQuestions);
  } catch (error) {
    console.error('Failed to export questions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 獲取全部問題（不限分頁）
async function getAllQuestions(projectId, searchTerm = '', chunkName = '', sourceType = 'all') {
  const { db } = await import('@/lib/db/index');

  const whereClause = {
    projectId
  };

  // 搜尋條件
  if (searchTerm) {
    whereClause.OR = [{ question: { contains: searchTerm } }, { questionLabel: { contains: searchTerm } }];
  }

  // 文字塊名稱篩選
  if (chunkName) {
    whereClause.chunk = {
      name: { contains: chunkName }
    };
  }

  // 資料來源型別篩選
  if (sourceType === 'text') {
    whereClause.imageName = null;
  } else if (sourceType === 'image') {
    whereClause.imageName = { not: null };
  }

  return await db.questions.findMany({
    where: whereClause,
    include: {
      chunk: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createAt: 'desc'
    }
  });
}

// 根據 ID 列表獲取問題
async function getQuestionsByIds(projectId, questionIds) {
  const { db } = await import('@/lib/db/index');

  return await db.questions.findMany({
    where: {
      projectId,
      id: { in: questionIds }
    },
    include: {
      chunk: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createAt: 'desc'
    }
  });
}
