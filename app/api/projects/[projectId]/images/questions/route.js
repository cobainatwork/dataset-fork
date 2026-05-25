import { NextResponse } from 'next/server';
import { getImageByName } from '@/lib/db/images';
import imageService from '@/lib/services/images';

// 生成圖片問題
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { imageName, count = 3, model, language = 'zh' } = await request.json();

    if (!imageName) {
      return NextResponse.json({ error: '缺少圖片名稱' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: '請選擇一個視覺模型' }, { status: 400 });
    }

    // 獲取圖片資訊
    const image = await getImageByName(projectId, imageName);
    if (!image) {
      return NextResponse.json({ error: '圖片不存在' }, { status: 404 });
    }

    // 呼叫圖片問題生成服務
    const result = await imageService.generateQuestionsForImage(projectId, image.id, {
      model,
      language,
      count
    });

    return NextResponse.json({
      success: true,
      questions: result.questions
    });
  } catch (error) {
    console.error('Failed to generate image questions:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate questions' }, { status: 500 });
  }
}
