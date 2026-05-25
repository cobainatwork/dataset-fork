import { NextResponse } from 'next/server';
import { getImageDetailWithQuestions } from '@/lib/services/images';

// 根據圖片ID獲取圖片詳情，包含問題列表和已標註資料
export async function GET(request, { params }) {
  try {
    const { projectId, imageId } = params;

    // 呼叫服務層獲取圖片詳情
    const imageData = await getImageDetailWithQuestions(projectId, imageId);

    return NextResponse.json({
      success: true,
      data: imageData
    });
  } catch (error) {
    console.error('Failed to get image details:', error);

    // 根據錯誤型別返回不同的狀態碼
    let statusCode = 500;
    if (error.message === '缺少圖片ID') {
      statusCode = 400;
    } else if (error.message === '圖片不存在') {
      statusCode = 404;
    } else if (error.message === '圖片不屬於指定專案') {
      statusCode = 403;
    }

    return NextResponse.json({ error: error.message || 'Failed to get image details' }, { status: statusCode });
  }
}
