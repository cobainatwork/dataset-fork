import { NextResponse } from 'next/server';
import { getUploadFileInfoById, delUploadFileInfoById } from '@/lib/db/upload-files';
import { getProject } from '@/lib/db/projects';
import { getProjectChunks, getProjectTocByName } from '@/lib/file/text-splitter';
import { batchSaveTags } from '@/lib/db/tags';
import { handleDomainTree } from '@/lib/util/domain-tree';
import path from 'path';
import { getProjectRoot } from '@/lib/db/base';
import { promises as fs } from 'fs';

/**
 * 批次刪除檔案
 * 複用單個檔案刪除的完整邏輯，包括領域樹修訂
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = params;
    const body = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { fileIds, domainTreeAction = 'keep', model, language = '中文' } = body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json({ error: 'File IDs array is required' }, { status: 400 });
    }

    console.log('開始處理批次刪除檔案請求');
    console.log('專案ID:', projectId);
    console.log('請求的檔案IDs:', fileIds);
    console.log('領域樹操作:', domainTreeAction);

    // 獲取專案資訊
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'The project does not exist' }, { status: 404 });
    }

    // 驗證檔案並刪除
    const results = [];
    const deletedTocs = [];
    let deletedCount = 0;
    let failedCount = 0;
    let totalStats = {
      deletedChunks: 0,
      deletedQuestions: 0,
      deletedDatasets: 0
    };

    for (const fileId of fileIds) {
      try {
        console.log(`正在驗證檔案: ${fileId}`);
        const fileInfo = await getUploadFileInfoById(fileId);

        if (!fileInfo) {
          console.log(`檔案不存在: ${fileId}`);
          results.push({
            fileId,
            success: false,
            error: 'File not found'
          });
          failedCount++;
          continue;
        }

        if (fileInfo.projectId !== projectId) {
          console.log(`檔案屬於其他專案: ${fileInfo.projectId} != ${projectId}`);
          results.push({
            fileId,
            success: false,
            error: 'File belongs to another project'
          });
          failedCount++;
          continue;
        }

        // 刪除檔案及其相關的文字塊、問題和資料集
        console.log(`刪除檔案: ${fileInfo.fileName}`);
        const { stats, fileName } = await delUploadFileInfoById(fileId);

        // 累計統計資訊
        totalStats.deletedChunks += stats.deletedChunks || 0;
        totalStats.deletedQuestions += stats.deletedQuestions || 0;
        totalStats.deletedDatasets += stats.deletedDatasets || 0;

        // 獲取並儲存刪除的 TOC 資訊
        const deleteToc = await getProjectTocByName(projectId, fileName);
        if (deleteToc) {
          deletedTocs.push(deleteToc);
        }

        // 刪除 TOC 檔案
        try {
          const projectRoot = await getProjectRoot();
          const projectPath = path.join(projectRoot, projectId);
          const tocDir = path.join(projectPath, 'toc');
          const baseName = path.basename(fileInfo.fileName, path.extname(fileInfo.fileName));
          const tocPath = path.join(tocDir, `${baseName}-toc.json`);
          await fs.unlink(tocPath);
          console.log(`成功刪除 TOC 檔案: ${tocPath}`);
        } catch (error) {
          console.error(`刪除 TOC 檔案失敗:`, String(error));
        }

        results.push({
          fileId,
          fileName: fileInfo.fileName,
          success: true,
          stats
        });
        deletedCount++;

        console.log(`成功刪除檔案: ${fileInfo.fileName}`);
      } catch (error) {
        console.error(`刪除檔案 ${fileId} 時出錯:`, error);
        results.push({
          fileId,
          success: false,
          error: error.message
        });
        failedCount++;
      }
    }

    console.log(`批次刪除完成: 成功${deletedCount}個, 失敗${failedCount}個`);

    // 如果選擇了保持領域樹不變，直接返回刪除結果
    if (domainTreeAction === 'keep') {
      return NextResponse.json({
        success: true,
        deletedCount,
        failedCount,
        total: fileIds.length,
        results,
        stats: totalStats,
        domainTreeAction: 'keep',
        message: `Successfully deleted ${deletedCount} files, ${failedCount} failed`
      });
    }

    // 處理領域樹更新
    try {
      // 獲取專案的所有檔案
      const { chunks, toc } = await getProjectChunks(projectId);

      // 如果不存在文字塊，說明專案已經沒有檔案了
      if (!chunks || chunks.length === 0) {
        // 清空領域樹
        await batchSaveTags(projectId, []);
        return NextResponse.json({
          success: true,
          deletedCount,
          failedCount,
          total: fileIds.length,
          results,
          stats: totalStats,
          domainTreeAction,
          message: `Successfully deleted ${deletedCount} files, domain tree cleared`,
          domainTreeCleared: true
        });
      }

      // 呼叫領域樹處理模組
      await handleDomainTree({
        projectId,
        action: domainTreeAction,
        allToc: toc,
        model: model,
        language,
        deleteToc: deletedTocs.length > 0 ? deletedTocs : undefined,
        project
      });

      console.log('領域樹更新成功');
    } catch (error) {
      console.error('Error updating domain tree after batch deletion:', String(error));
      // 即使領域樹更新失敗，也不影響檔案刪除的結果
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      failedCount,
      total: fileIds.length,
      results,
      stats: totalStats,
      domainTreeAction,
      message: `Successfully deleted ${deletedCount} files, ${failedCount} failed`
    });
  } catch (error) {
    console.error('Error batch deleting files:', String(error));
    return NextResponse.json({ error: String(error) || 'Failed to batch delete files' }, { status: 500 });
  }
}
