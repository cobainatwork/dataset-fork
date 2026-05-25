import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getImageDetailWithQuestions } from '@/lib/services/images';

const prisma = new PrismaClient();

// 獲取下一個有未標註問題的圖片
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 查詢第一個有未標註問題的圖片
    const unansweredQuestion = await prisma.questions.findFirst({
      where: {
        projectId,
        imageId: {
          not: null
        },
        answered: false
      }
    });

    if (!unansweredQuestion) {
      return NextResponse.json({
        success: true,
        data: null
      });
    }

    // 呼叫服務層獲取圖片詳情
    const imageData = await getImageDetailWithQuestions(projectId, unansweredQuestion.imageId);

    return NextResponse.json({
      success: true,
      data: imageData
    });
  } catch (error) {
    console.error('Failed to get next unanswered image:', error);
    return NextResponse.json({ error: error.message || 'Failed to get next unanswered image' }, { status: 500 });
  }
}
