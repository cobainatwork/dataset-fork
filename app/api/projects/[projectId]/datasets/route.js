import { NextResponse } from 'next/server';
import {
  deleteDataset,
  getDatasetsByPagination,
  getDatasetsIds,
  getDatasetsById,
  updateDataset
} from '@/lib/db/datasets';
import datasetService from '@/lib/services/datasets';

// 最佳化思維鏈函式已移至服務層

/**
 * 生成資料集（為單個問題生成答案）
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const { questionId, model, language } = await request.json();

    // 使用資料集生成服務
    const result = await datasetService.generateDatasetForQuestion(projectId, questionId, {
      model,
      language
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to generate dataset:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to generate dataset'
      },
      { status: 500 }
    );
  }
}

/**
 * 獲取專案的所有資料集
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = params;
    const { searchParams } = new URL(request.url);
    // 驗證專案ID
    if (!projectId) {
      return NextResponse.json({ error: '專案ID不能為空' }, { status: 400 });
    }
    const page = parseInt(searchParams.get('page')) || 1;
    const size = parseInt(searchParams.get('size')) || 10;
    const input = searchParams.get('input');
    const field = searchParams.get('field') || 'question';
    const status = searchParams.get('status');
    const hasCot = searchParams.get('hasCot');
    const isDistill = searchParams.get('isDistill');
    const scoreRange = searchParams.get('scoreRange');
    const customTag = searchParams.get('customTag');
    const noteKeyword = searchParams.get('noteKeyword');
    const chunkName = searchParams.get('chunkName');
    let confirmed = undefined;
    if (status === 'confirmed') confirmed = true;
    if (status === 'unconfirmed') confirmed = false;

    let selectedAll = searchParams.get('selectedAll');

    if (selectedAll) {
      let data = await getDatasetsIds(
        projectId,
        confirmed,
        input,
        field,
        hasCot,
        isDistill,
        scoreRange,
        customTag,
        noteKeyword,
        chunkName
      );
      return NextResponse.json(data);
    }

    // 獲取資料集
    const datasets = await getDatasetsByPagination(
      projectId,
      page,
      size,
      confirmed,
      input,
      field, // 傳遞搜尋欄位引數
      hasCot, // 傳遞思維鏈篩選引數
      isDistill, // 傳遞蒸餾資料集篩選引數
      scoreRange, // 傳遞評分範圍篩選引數
      customTag, // 傳遞自定義標籤篩選引數
      noteKeyword, // 傳遞備註關鍵字篩選引數
      chunkName // 傳遞文字塊名稱篩選引數
    );

    return NextResponse.json(datasets);
  } catch (error) {
    console.error('獲取資料集失敗:', String(error));
    return NextResponse.json(
      {
        error: error.message || '獲取資料集失敗'
      },
      { status: 500 }
    );
  }
}

/**
 * 刪除資料集
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('id');
    if (!datasetId) {
      return NextResponse.json(
        {
          error: 'Dataset ID cannot be empty'
        },
        { status: 400 }
      );
    }

    await deleteDataset(datasetId);

    return NextResponse.json({
      success: true,
      message: 'Dataset deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete dataset:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to delete dataset'
      },
      { status: 500 }
    );
  }
}

/**
 * 編輯資料集
 */
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('id');
    const { answer, cot, question, confirmed } = await request.json();
    if (!datasetId) {
      return NextResponse.json(
        {
          error: 'Dataset ID cannot be empty'
        },
        { status: 400 }
      );
    }
    // 獲取所有資料集
    let dataset = await getDatasetsById(datasetId);
    if (!dataset) {
      return NextResponse.json(
        {
          error: 'Dataset does not exist'
        },
        { status: 404 }
      );
    }
    let data = { id: datasetId };
    if (confirmed !== undefined) data.confirmed = confirmed;
    if (answer) data.answer = answer;
    if (cot) data.cot = cot;
    if (question) data.question = question;

    // 儲存更新後的資料集列表
    await updateDataset(data);

    return NextResponse.json({
      success: true,
      message: 'Dataset updated successfully',
      dataset: dataset
    });
  } catch (error) {
    console.error('Failed to update dataset:', String(error));
    return NextResponse.json(
      {
        error: error.message || 'Failed to update dataset'
      },
      { status: 500 }
    );
  }
}
