import { NextResponse } from 'next/server';
import { getUploadFileInfoById } from '@/lib/db/upload-files';
import { createGaPairs, getGaPairsByFileId } from '@/lib/db/ga-pairs';

/**
 * 批次手動新增 GA 對到多個檔案
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { fileIds, gaPair, appendMode = false } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'File IDs array is required' }, { status: 400 });
    }

    if (!gaPair || !gaPair.genreTitle || !gaPair.audienceTitle) {
      return NextResponse.json({ error: 'GA pair with genreTitle and audienceTitle is required' }, { status: 400 });
    }

    console.log('開始處理批次手動新增GA對請求');
    console.log('專案ID:', projectId);
    console.log('請求的檔案IDs:', fileIds);
    console.log('GA對:', gaPair);

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

    // 批次手動新增 GA 對
    console.log('開始批次手動新增GA對...');
    console.log('追加模式:', appendMode);
    const results = [];

    for (const file of validFiles) {
      try {
        console.log(`處理檔案: ${file.fileName}`);

        // 檢查是否已存在 GA 對
        const existingPairs = await getGaPairsByFileId(file.id);

        let pairNumber = 1;
        if (appendMode && existingPairs && existingPairs.length > 0) {
          // 追加模式：在現有 GA 對後面新增
          pairNumber = existingPairs.length + 1;
        } else if (!appendMode && existingPairs && existingPairs.length > 0) {
          // 非追加模式：如果已存在 GA 對則跳過
          console.log(`檔案 ${file.fileName} 已存在GA對，跳過`);
          results.push({
            fileId: file.id,
            fileName: file.fileName,
            success: true,
            skipped: true,
            message: 'GA pairs already exist'
          });
          continue;
        }

        // 建立 GA 對資料
        const gaPairData = [
          {
            projectId,
            fileId: file.id,
            pairNumber,
            genreTitle: gaPair.genreTitle.trim(),
            genreDesc: gaPair.genreDesc?.trim() || '',
            audienceTitle: gaPair.audienceTitle.trim(),
            audienceDesc: gaPair.audienceDesc?.trim() || '',
            isActive: true
          }
        ];

        // 儲存 GA 對
        if (appendMode) {
          // 追加模式：只建立新的 GA 對
          await createGaPairs(gaPairData);
        } else {
          // 非追加模式：使用 saveGaPairs 替換現有的
          const { saveGaPairs } = await import('@/lib/db/ga-pairs');
          await saveGaPairs(projectId, file.id, [
            {
              genre: { title: gaPair.genreTitle.trim(), description: gaPair.genreDesc?.trim() || '' },
              audience: { title: gaPair.audienceTitle.trim(), description: gaPair.audienceDesc?.trim() || '' }
            }
          ]);
        }

        results.push({
          fileId: file.id,
          fileName: file.fileName,
          success: true,
          skipped: false,
          message: 'GA pair added successfully'
        });

        console.log(`成功為檔案 ${file.fileName} 新增GA對`);
      } catch (error) {
        console.error(`為檔案 ${file.fileName} 新增GA對失敗:`, error);
        results.push({
          fileId: file.id,
          fileName: file.fileName,
          success: false,
          skipped: false,
          error: error.message,
          message: `Failed: ${error.message}`
        });
      }
    }

    // 統計結果
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`批次手動新增完成: 成功${successCount}個, 失敗${failureCount}個`);

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
      message: `Added GA pairs to ${successCount} files, ${failureCount} failed, ${invalidFileIds.length} files not found`
    });
  } catch (error) {
    console.error('Error batch adding manual GA pairs:', String(error));
    return NextResponse.json({ error: String(error) || 'Failed to batch add manual GA pairs' }, { status: 500 });
  }
}
