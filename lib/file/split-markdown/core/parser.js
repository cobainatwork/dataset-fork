/**
 * Markdown文件解析模組
 */

/**
 * 提取文件大綱
 * @param {string} text - Markdown文字
 * @returns {Array} - 提取的大綱陣列
 */
function extractOutline(text) {
  const outlineRegex = /^(#{1,6})\s+(.+?)(?:\s*\{#[\w-]+\})?\s*$/gm;
  const outline = [];
  let match;

  while ((match = outlineRegex.exec(text)) !== null) {
    const level = match[1].length;
    const title = match[2].trim();

    outline.push({
      level,
      title,
      position: match.index
    });
  }

  return outline;
}

/**
 * 根據標題分割文件
 * @param {string} text - Markdown文字
 * @param {Array} outline - 文件大綱
 * @returns {Array} - 按標題分割的段落陣列
 */
function splitByHeadings(text, outline) {
  if (outline.length === 0) {
    return [
      {
        heading: null,
        level: 0,
        content: text,
        position: 0
      }
    ];
  }

  const sections = [];

  // 新增第一個標題前的內容（如果有）
  if (outline[0].position > 0) {
    const frontMatter = text.substring(0, outline[0].position).trim();
    if (frontMatter.length > 0) {
      sections.push({
        heading: null,
        level: 0,
        content: frontMatter,
        position: 0
      });
    }
  }

  // 分割每個標題的內容
  for (let i = 0; i < outline.length; i++) {
    const current = outline[i];
    const next = i < outline.length - 1 ? outline[i + 1] : null;

    const headingLine = text.substring(current.position).split('\n')[0];
    const startPos = current.position + headingLine.length + 1;
    const endPos = next ? next.position : text.length;

    let content = text.substring(startPos, endPos).trim();

    sections.push({
      heading: current.title,
      level: current.level,
      content: content,
      position: current.position
    });
  }

  return sections;
}

module.exports = {
  extractOutline,
  splitByHeadings
};
