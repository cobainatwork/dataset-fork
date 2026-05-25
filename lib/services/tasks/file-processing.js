/**
 * 檔案處理任務
 */
import { splitProjectFile } from '@/lib/file/text-splitter';
import { handleDomainTree } from '@/lib/util/domain-tree';
import { processPdf, getFilePageCount } from '@/lib/file/file-process/pdf';
import { getProject, updateProject } from '@/lib/db/projects';
import { TASK } from '@/constant';
import { updateTask } from './index';

/**
 * 處理檔案處理任務
 * @param {Object} task 任務物件
 */
export async function processFileProcessingTask(task) {
  const taskMessage = {
    current: {
      fileName: '',
      processedPage: 0,
      totalPage: 0
    },
    stepInfo: '',
    processedFiles: 0,
    totalFiles: 0,
    errorList: [],
    finishedList: []
  };
  try {
    console.log(`start processing file processing task: ${task.id}`);

    const params = JSON.parse(task.note);
    const { projectId, fileList, strategy = 'default', vsionModel, domainTreeAction } = params;

    // 記錄檔案總數
    taskMessage.totalFiles = fileList.length;

    // 計算轉換總頁數
    const totalPages = await getFilePageCount(projectId, fileList);

    // 更新任務資訊
    taskMessage.stepInfo = `Total ${taskMessage.totalFiles} files to process, total ${totalPages} pages`;

    // 更新任務狀態
    await updateTask(task.id, {
      status: TASK.STATUS.PROCESSING,
      totalCount: totalPages + 1, // 總頁數 + 領域樹處理
      detail: JSON.stringify(taskMessage),
      startTime: new Date()
    });

    //進行文字分割
    let fileResult = {
      totalChunks: 0,
      chunks: [],
      toc: ''
    };

    const project = await getProject(projectId);

    // 迴圈處理檔案
    for (const file of fileList) {
      try {
        taskMessage.current.fileName = file.fileName;
        taskMessage.current.processedPage = 1; // 重置當前處理頁數
        taskMessage.current.totalPage = file.pageCount || 1; // 設定當前檔案總頁數

        await updateTask(task.id, {
          status: TASK.STATUS.PROCESSING,
          totalCount: totalPages + 1, // 總頁數 + 領域樹處理
          detail: JSON.stringify(taskMessage),
          startTime: new Date()
        });

        if (file.fileName.endsWith('.pdf')) {
          task.vsionModel = vsionModel; // 僅用於視覺模型處理
          const result = await processPdf(strategy, projectId, file.fileName, {
            ...params.options,
            updateTask: updateTask,
            task: task,
            message: taskMessage
          });
          //確認檔案處理狀態
          if (!result.success) {
            throw new Error(result.error || `File processing failed`);
          }
        }

        // 文字分割
        const { toc, chunks, totalChunks } = await splitProjectFile(projectId, file);
        fileResult.toc += toc;
        fileResult.chunks.push(...chunks);
        fileResult.totalChunks += totalChunks;
        console.log(projectId, file.fileName, `${file.fileName} Text split completed`);

        // 更新任務資訊
        taskMessage.finishedList.push(file);
        taskMessage.processedFiles++;
        await updateTask(task.id, {
          completedCount: task.completedCount + file.pageCount, // 已處理頁數
          detail: JSON.stringify(taskMessage), // 更新任務資訊
          updateAt: new Date()
        });
        task.completedCount += file.pageCount; // 更新任務已完成頁數
      } catch (error) {
        const errorMessage = `Processing file ${file.fileName} failed: ${error.message}`;
        taskMessage.errorList.push(errorMessage);
        console.error(errorMessage);
        //將檔案粒度的任務資訊儲存到任務詳情中
        await updateTask(task.id, {
          detail: JSON.stringify(taskMessage)
        });
      }
    }

    console.log('domainTreeAction', domainTreeAction);
    try {
      // 呼叫領域樹處理模組
      const tags = await handleDomainTree({
        projectId,
        newToc: fileResult.toc,
        model: JSON.parse(task.modelInfo),
        language: task.language,
        action: domainTreeAction,
        fileList,
        project
      });

      if (!tags && domainTreeAction !== 'keep') {
        await updateProject(projectId, { ...project });
      }

      //整個轉換任務=》文字分割=》領域樹構造結束後 轉換完成
      console.log(`File processing completed successfully`);
      // 更新任務進度
      taskMessage.stepInfo = `File processing completed successfully`;
      await updateTask(task.id, {
        completedCount: task.totalCount,
        status: TASK.STATUS.COMPLETED,
        detail: JSON.stringify(taskMessage)
      });
    } catch (error) {
      console.error(`processing failed:`, error);
      taskMessage.stepInfo = `File processing failed: ${error.message}`;
      // 更新任務狀態為失敗
      await updateTask(task.id, {
        status: TASK.STATUS.FAILED,
        completedCount: 0,
        detail: JSON.stringify(taskMessage),
        endTime: new Date()
      });
      return;
    }
    console.log(`task ${task.id} finished`);
  } catch (error) {
    console.error('pdf processing failed:', error);
    taskMessage.stepInfo = `File processing failed: ${String(error)}`;
    await updateTask(task.id, {
      status: TASK.STATUS.FAILED,
      detail: JSON.stringify(taskMessage),
      endTime: new Date()
    });
  }
}

export default {
  processFileProcessingTask
};
