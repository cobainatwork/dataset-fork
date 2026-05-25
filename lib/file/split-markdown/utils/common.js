/**
 * 通用工具函式模組
 */

const fs = require('fs');
const path = require('path');

/**
 * 檢查並建立目錄
 * @param {string} directory - 目錄路徑
 */
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

/**
 * 從檔案路徑獲取不帶副檔名的檔名
 * @param {string} filePath - 檔案路徑
 * @returns {string} - 不帶副檔名的檔名
 */
function getFilenameWithoutExt(filePath) {
  return path.basename(filePath).replace(/\.[^/.]+$/, '');
}

module.exports = {
  ensureDirectoryExists,
  getFilenameWithoutExt
};
