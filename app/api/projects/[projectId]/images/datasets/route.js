import { NextResponse } from 'next/server';
import { getImageByName } from '@/lib/db/images';
import imageService from '@/lib/services/images';

// 生成影像資料集
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { imageName, question, model, language = 'zh', previewOnly = false } = await request.json();

    if (!imageName || !question) {
      return NextResponse.json({ error: '缺少必要引數' }, { status: 400 });
    }

    if (!model) {
      return NextResponse.json({ error: '請選擇一個視覺模型' }, { status: 400 });
    }

    // 獲取圖片資訊
    const image = await getImageByName(projectId, imageName);
    if (!image) {
      return NextResponse.json({ error: '圖片不存在' }, { status: 404 });
    }

    // 呼叫圖片資料集生成服務
    const result = await imageService.generateDatasetForImage(projectId, image.id, question, {
      model,
      language,
      previewOnly
    });

    return NextResponse.json({
      success: true,
      answer: result.answer,
      dataset: result.dataset
    });
  } catch (error) {
    console.error('Failed to generate image dataset:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate dataset' }, { status: 500 });
  }
}
