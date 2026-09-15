import i18n from '@/lib/i18n';
import { request } from '@/lib/util/request';

/**
 * 上傳檔案
 * @param {File} file 檔案
 * @param {string} projectId 專案ID
 * @param {string} fileContent 檔案內容
 * @param {string} fileName 檔名
 * @param {function} t 國際化函式
 * @returns
 */
export async function uploadFile({ file, projectId, fileContent, fileName, t }) {
  return await request(`/api/projects/${projectId}/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-file-name': encodeURIComponent(fileName)
    },
    body: file.name.endsWith('.docx') ? new TextEncoder().encode(fileContent) : fileContent,
    errMsg: t('textSplit.uploadFailed')
  });
}

/**
 * 刪除檔案
 * @param {Object} fileToDelete 檔案資訊
 * @param {string} projectId 專案ID
 * @param {string} domainTreeActionType 域樹處理方式
 * @param {Object} modelInfo 模型資訊
 * @returns
 */
export async function deleteFile({ fileToDelete, projectId, domainTreeActionType, modelInfo }) {
  return await request(
    `/api/projects/${projectId}/files?fileId=${fileToDelete.fileId}&domainTreeAction=${domainTreeActionType || 'keep'}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelInfo,
        language: i18n.language
      })
    }
  );
}

/**
 * 替換檔案（docver replace）：server 端完成寫檔、lineage/稽核、清除舊衍生，
 * 並建立 file-processing task 重跑分塊；UI 不再重發 upload chain。
 * @param {string} projectId 專案ID
 * @param {string} oldFileId 被替換的檔案ID
 * @param {File} file 原始檔案物件
 * @param {ArrayBuffer} fileContent 檔案內容（二進位）
 * @param {string} fileName 檔名
 * @param {Object} [taskConfig] file-processing task 參數 { strategy, visionModel }
 * @param {function} t 國際化函式
 * @returns {Promise<{newFileId: string, fileName: string, taskId: string}>}
 */
export async function replaceFile({ projectId, oldFileId, file, fileContent, fileName, taskConfig, t }) {
  return await request(`/api/projects/${projectId}/files/${oldFileId}/replace`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-file-name': encodeURIComponent(fileName),
      'x-task-config': JSON.stringify(taskConfig || {})
    },
    body: file.name.endsWith('.docx') ? new TextEncoder().encode(fileContent) : fileContent,
    errMsg: t('textSplit.replaceFailed')
  });
}

/**
 * 獲取檔案列表
 * @param {string} projectId 專案ID
 * @param {number} page 頁碼
 * @param {number} size 每頁大小
 * @param {string} fileName 搜尋檔名（可選）
 */
export async function getFiles({ projectId, page, size, fileName }) {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: size.toString()
  });

  if (fileName && fileName.trim()) {
    params.append('fileName', fileName.trim());
  }

  return await request(`/api/projects/${projectId}/files?${params}`);
}
