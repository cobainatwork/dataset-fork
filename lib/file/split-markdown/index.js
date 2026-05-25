/**
 * Markdown文字分割工具主模組
 */

const parser = require('./core/parser');
const splitter = require('./core/splitter');
const summary = require('./core/summary');
const formatter = require('./output/formatter');
const fileWriter = require('./output/fileWriter');
const toc = require('./core/toc');

/**
 * 拆分Markdown文件
 * @param {string} markdownText - Markdown文字
 * @param {number} minSplitLength - 最小分割字數
 * @param {number} maxSplitLength - 最大分割字數
 * @returns {Array} - 分割結果陣列
 */
function splitMarkdown(markdownText, minSplitLength, maxSplitLength) {
  // 解析文件結構
  const outline = parser.extractOutline(markdownText);

  // 按標題分割文件
  const sections = parser.splitByHeadings(markdownText, outline);

  // 處理段落，確保滿足分割條件
  const res = splitter.processSections(sections, outline, minSplitLength, maxSplitLength);

  return res.map(r => ({
    result: `> **📑 Summarization：** *${r.summary}*\n\n---\n\n${r.content}`,
    ...r
  }));
}

// 匯出模組功能
module.exports = {
  // 核心功能
  splitMarkdown,
  combineMarkdown: formatter.combineMarkdown,
  saveToSeparateFiles: fileWriter.saveToSeparateFiles,

  // 目錄提取功能
  extractTableOfContents: toc.extractTableOfContents,
  tocToMarkdown: toc.tocToMarkdown,

  // 其他匯出的子功能
  parser,
  splitter,
  summary,
  formatter,
  fileWriter,
  toc
};
