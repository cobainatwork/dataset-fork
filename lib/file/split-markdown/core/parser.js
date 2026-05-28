/**
 * Markdown文件解析模組
 */

/**
 * 判斷一行是否為「中文 / 阿拉伯數字 + 、」開頭的章節標題。
 * 適用於 PDF 轉 markdown 後常見的「五、 標題」「20、 標題」格式（無 # 前綴）。
 *
 * 條件（全部滿足才視為 heading）：
 *   1. trim 後非空、長度 ≤ 80（標題行不會太長）
 *   2. 不以 # 開頭（避免與 markdown heading 衝突）
 *   3. 不含 HTML structural tag（避免在 table/div 內誤判）
 *   4. 行首符合「中文編號（壹/一/十二/百…）或阿拉伯數字 + 、 + 空白 + 至少一個字」
 */
function isChineseNumberedHeading(line) {
  const t = (line || '').trim();
  if (!t || t.length > 80) return false;
  if (t.startsWith('#')) return false;
  if (/<\/?(?:table|tr|td|th|tbody|thead|p|div|span|li|ul|ol|img|a|br)\b/i.test(t)) return false;
  return /^[壹貳參肆伍陸柒捌玖拾零一二三四五六七八九十百千〇]+、\s+\S/.test(t)
      || /^\d+、\s+\S/.test(t);
}

/**
 * 提取文件大綱
 * @param {string} text - Markdown文字
 * @returns {Array} - 提取的大綱陣列（含 markdown # heading 與中文編號 heading）
 */
function extractOutline(text) {
  const outline = [];

  // 1) markdown # heading
  const mdRegex = /^(#{1,6})\s+(.+?)(?:\s*\{#[\w-]+\})?\s*$/gm;
  let match;
  while ((match = mdRegex.exec(text)) !== null) {
    outline.push({
      level: match[1].length,
      title: match[2].trim(),
      position: match.index,
      headingType: 'md'
    });
  }

  // 2) 中文編號 / 阿拉伯數字 heading（逐行掃，position 用 line 起始 offset）
  let cursor = 0;
  for (const line of text.split('\n')) {
    if (isChineseNumberedHeading(line)) {
      outline.push({
        level: 2,
        title: line.trim(),
        position: cursor,
        headingType: 'cn-numbered'
      });
    }
    cursor += line.length + 1; // +1 換行符
  }

  // 3) 按文件出現順序排序
  outline.sort((a, b) => a.position - b.position);
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
      position: current.position,
      headingType: current.headingType
    });
  }

  return sections;
}

module.exports = {
  extractOutline,
  splitByHeadings
};
