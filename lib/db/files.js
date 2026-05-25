/**
 * 檔案操作輔助函式
 */
const path = require('path');
const { promises: fs } = require('fs');
const { getProjectRoot, readJSON } = require('./base');
const { getProject } = require('./projects');
const { getUploadFileInfoById } = require('./upload-files');

/**
 * 獲取專案檔案內容
 * @param {string} projectId - 專案ID
 * @param {string} fileName - 檔名
 * @returns {Promise<string>} 檔案內容
 */
async function getProjectFileContent(projectId, fileName) {
  try {
    // 獲取專案根目錄
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    const filePath = path.join(projectPath, 'files', fileName);

    // 讀取檔案內容
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('獲取專案檔案內容失敗:', error);
    return '';
  }
}

/**
 * 根據檔案ID獲取專案檔案內容
 * @param {string} projectId - 專案ID
 * @param {string} fileId - 檔案ID
 * @returns {Promise<string>} 檔案內容
 */
async function getProjectFileContentById(projectId, fileId) {
  try {
    // 獲取檔案資訊
    const fileInfo = await getUploadFileInfoById(fileId);
    if (!fileInfo) {
      throw new Error('檔案不存在');
    }

    // 獲取專案根目錄
    const projectRoot = await getProjectRoot();
    const projectPath = path.join(projectRoot, projectId);
    const filePath = path.join(projectPath, 'files', fileInfo.fileName);

    // 讀取檔案內容
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error('根據ID獲取專案檔案內容失敗:', error);
    return '';
  }
}

module.exports = {
  getProjectFileContent,
  getProjectFileContentById
};
