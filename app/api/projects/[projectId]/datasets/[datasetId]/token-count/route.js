import { NextResponse } from 'next/server';
import { getDatasetsById } from '@/lib/db/datasets';
import { getEncoding } from '@langchain/core/utils/tiktoken';

/**
 * 非同步計算資料集文字的Token數量
 */
export async function GET(request, { params }) {
  try {
    const { projectId, datasetId } = params;

    if (!datasetId) {
      return NextResponse.json({ error: '資料集ID不能為空' }, { status: 400 });
    }

    const datasets = await getDatasetsById(datasetId);
    const tokenCounts = {
      answerTokens: 0,
      cotTokens: 0
    };

    try {
      if (datasets.answer || datasets.cot) {
        // 使用 cl100k_base 編碼，適用於 gpt-3.5-turbo 和 gpt-4
        const encoding = await getEncoding('cl100k_base');

        if (datasets.answer) {
          const tokens = encoding.encode(datasets.answer);
          tokenCounts.answerTokens = tokens.length;
        }

        if (datasets.cot) {
          const tokens = encoding.encode(datasets.cot);
          tokenCounts.cotTokens = tokens.length;
        }
      }
    } catch (error) {
      console.error('計算Token數量失敗:', String(error));
      return NextResponse.json({ error: '計算Token數量失敗' }, { status: 500 });
    }

    return NextResponse.json(tokenCounts);
  } catch (error) {
    console.error('獲取Token計數失敗:', String(error));
    return NextResponse.json(
      {
        error: error.message || '獲取Token計數失敗'
      },
      { status: 500 }
    );
  }
}
