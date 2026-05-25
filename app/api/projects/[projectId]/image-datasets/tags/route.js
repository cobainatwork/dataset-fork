import { NextResponse } from 'next/server';
import { getImageDatasetsTagsByProject } from '@/lib/db/imageDatasets';

// 獲取專案中所有已使用的標籤
export async function GET(request, { params }) {
  try {
    const { projectId } = params;

    // 獲取專案的所有資料集
    const datasets = await getImageDatasetsTagsByProject(projectId);

    console.log('datasets', datasets);

    // 提取所有標籤
    const tagsSet = new Set();
    datasets.forEach(dataset => {
      if (dataset.tags) {
        try {
          const tags = JSON.parse(dataset.tags);
          if (Array.isArray(tags)) {
            tags.forEach(tag => tagsSet.add(tag));
          }
        } catch (e) {
          // 忽略解析錯誤
        }
      }
    });

    // 轉換為陣列並排序
    const tags = Array.from(tagsSet).sort();

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Failed to get tags:', error);
    return NextResponse.json({ error: error.message || 'Failed to get tags' }, { status: 500 });
  }
}
