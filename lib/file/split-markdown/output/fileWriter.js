/**
 * 檔案輸出模組
 */

const fs = require('fs');
const path = require('path');
const { ensureDirectoryExists } = require('../utils/common');

/**
 * 將分割結果儲存到單獨的檔案
 * @param {Array} splitResult - 分割結果陣列
 * @param {string} baseFilename - 基礎檔名（不包含副檔名）
 * @param {Function} callback - 回撥函式
 */
function saveToSeparateFiles(splitResult, baseFilename, callback) {
  // 獲取基礎目錄和檔名（無副檔名）
  const basePath = path.dirname(baseFilename);
  const filenameWithoutExt = path.basename(baseFilename).replace(/\.[^/.]+$/, '');

  // 建立用於存放分割檔案的目錄
  const outputDir = path.join(basePath, `${filenameWithoutExt}_parts`);

  // 確保目錄存在
  ensureDirectoryExists(outputDir);

  // 遞迴儲存檔案
  function saveFile(index) {
    if (index >= splitResult.length) {
      // 所有檔案儲存完成
      callback(null, outputDir, splitResult.length);
      return;
    }

    const part = splitResult[index];
    const paddedIndex = String(index + 1).padStart(3, '0'); // 確保檔案排序正確
    const outputFile = path.join(outputDir, `${filenameWithoutExt}_part${paddedIndex}.md`);

    // 將摘要和內容格式化為Markdown
    const content = `> **📑 Summarization：** *${part.summary}*\n\n---\n\n${part.content}`;

    fs.writeFile(outputFile, content, 'utf8', err => {
      if (err) {
        callback(err);
        return;
      }

      // 繼續儲存下一個檔案
      saveFile(index + 1);
    });
  }

  // 開始儲存檔案
  saveFile(0);
}

module.exports = {
  saveToSeparateFiles
};
