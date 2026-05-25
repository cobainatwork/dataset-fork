import { NextResponse } from 'next/server';
import { batchGenerateGaPairs } from '@/lib/services/ga/ga-pairs';
import { getUploadFileInfoById } from '@/lib/db/upload-files'; // 匯入單個檔案查詢函式

/**
 * 批次生成多個檔案的 GA 對
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { fileIds, modelConfigId, language = '中文', appendMode = false } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'File IDs array is required' }, { status: 400 });
    }

    if (!modelConfigId) {
      return NextResponse.json({ error: 'Model configuration ID is required' }, { status: 400 });
    }

    console.log('開始處理批次生成GA對請求');
    console.log('專案ID:', projectId);
    console.log('請求的檔案IDs:', fileIds);

    // 使用 getUploadFileInfoById 逐個驗證檔案
    const validFiles = [];
    const invalidFileIds = [];

    for (const fileId of fileIds) {
      try {
        console.log(`正在驗證檔案: ${fileId}`);
        const fileInfo = await getUploadFileInfoById(fileId);

        if (fileInfo && fileInfo.projectId === projectId) {
          console.log(`檔案驗證成功: ${fileInfo.fileName}`);
          validFiles.push(fileInfo);
        } else if (fileInfo) {
          console.log(`檔案屬於其他專案: ${fileInfo.projectId} != ${projectId}`);
          invalidFileIds.push(fileId);
        } else {
          console.log(`檔案不存在: ${fileId}`);
          invalidFileIds.push(fileId);
        }
      } catch (error) {
        console.error(`驗證檔案 ${fileId} 時出錯:`, String(error));
        invalidFileIds.push(fileId);
      }
    }

    console.log(`檔案驗證完成: 有效${validFiles.length}個, 無效${invalidFileIds.length}個`);

    if (validFiles.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid files found',
          debug: {
            projectId,
            requestedIds: fileIds,
            invalidIds: invalidFileIds,
            message: 'None of the requested files belong to this project or exist in the database'
          }
        },
        { status: 404 }
      );
    }

    // 批次生成 GA 對
    console.log('開始批次生成GA對...');
    console.log('追加模式:', appendMode);
    const results = await batchGenerateGaPairs(
      projectId,
      validFiles,
      modelConfigId,
      language,
      appendMode // 傳遞追加模式引數
    );

    // 統計結果
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`批次生成完成: 成功${successCount}個, 失敗${failureCount}個`);

    return NextResponse.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount,
        processed: validFiles.length,
        skipped: invalidFileIds.length
      },
      message: `Generated GA pairs for ${successCount} files, ${failureCount} failed, ${invalidFileIds.length} files not found`
    });
  } catch (error) {
    console.error('Error batch generating GA pairs:', String(error));
    return NextResponse.json({ error: String(error) || 'Failed to batch generate GA pairs' }, { status: 500 });
  }
}
