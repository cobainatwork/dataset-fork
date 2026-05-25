/**
 * 輸出格式化模組
 */

/**
 * 將分割後的文字重新組合成Markdown文件
 * @param {Array} splitResult - 分割結果陣列
 * @returns {string} - 組合後的Markdown文件
 */
function combineMarkdown(splitResult) {
  let result = '';

  for (let i = 0; i < splitResult.length; i++) {
    const part = splitResult[i];

    // 新增分隔線和摘要
    if (i > 0) {
      result += '\n\n---\n\n';
    }

    result += `> **📑 Summarization：** *${part.summary}*\n\n---\n\n${part.content}`;
  }

  return result;
}

module.exports = {
  combineMarkdown
};
