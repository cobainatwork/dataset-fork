/**
 * Markdown 文件分割模組
 *
 * 策略 (修法 A — 禁止跨標題合併):
 *   每個 markdown heading section 獨立成一個 chunk。chunk 邊界永遠對齊
 *   標題行 — 不會把下一個 section 的標題吃進當前 chunk 的尾巴。
 *   minSplitLength 參數保留 signature 但不再尊重 (chunk 小於 min 是
 *   接受的代價，換取邊界乾淨)。
 *   過大的 section (> maxSplitLength) 仍會被切成多個 sub-chunk，每個
 *   sub-chunk 都會 prepend 該 section 的 heading 行。
 */

const summary = require('./summary');

/**
 * 分割超長段落
 * @param {Object} section - 段落物件
 * @param {number} maxSplitLength - 最大分割字數
 * @returns {Array<string>} - 分割後的段落內容陣列 (不含 heading)
 */
function splitLongSection(section, maxSplitLength) {
  const content = section.content;
  const paragraphs = content.split(/\n\n+/);
  const result = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxSplitLength) {
      if (currentChunk.length > 0) {
        result.push(currentChunk);
        currentChunk = '';
      }
      const sentenceSplit = paragraph.match(/[^.!?。！？]+[.!?。！？]+/g) || [paragraph];
      let sentenceChunk = '';
      for (const sentence of sentenceSplit) {
        if ((sentenceChunk + sentence).length <= maxSplitLength) {
          sentenceChunk += sentence;
        } else {
          if (sentenceChunk.length > 0) {
            result.push(sentenceChunk);
          }
          if (sentence.length > maxSplitLength) {
            for (let i = 0; i < sentence.length; i += maxSplitLength) {
              result.push(sentence.substr(i, maxSplitLength));
            }
            sentenceChunk = '';
          } else {
            sentenceChunk = sentence;
          }
        }
      }
      if (sentenceChunk.length > 0) {
        currentChunk = sentenceChunk;
      }
    } else if ((currentChunk + '\n\n' + paragraph).length <= maxSplitLength) {
      currentChunk = currentChunk.length > 0 ? currentChunk + '\n\n' + paragraph : paragraph;
    } else {
      result.push(currentChunk);
      currentChunk = paragraph;
    }
  }

  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
}

/**
 * 處理段落 — 每個 heading section 獨立成 chunk
 * @param {Array} sections - 段落陣列 (來自 parser.splitByHeadings)
 * @param {Array} outline - 目錄大綱
 * @param {number} _minSplitLength - 保留 signature; 不再尊重
 * @param {number} maxSplitLength - 最大分割字數
 * @returns {Array<{summary: string, content: string}>}
 */
function processSections(sections, outline, _minSplitLength, maxSplitLength) {
  const result = [];

  for (const section of sections) {
    if (!section.headings && section.heading) {
      section.headings = [{ heading: section.heading, level: section.level, position: section.position }];
    }

    // 純標題、無實質內容：略過 (chunk 只有一行 heading 無語意)
    const trimmedContent = (section.content || '').trim();
    if (trimmedContent.length === 0) {
      continue;
    }

    const headingLine = section.heading
      ? `${'#'.repeat(section.level)} ${section.heading}\n`
      : '';

    if (trimmedContent.length <= maxSplitLength) {
      const chunkSummary = summary.generateEnhancedSummary(section, outline);
      result.push({
        summary: chunkSummary,
        content: `${headingLine}${trimmedContent}`
      });
      continue;
    }

    // 過大 section：切多塊，每塊都帶 heading
    const subSections = splitLongSection(section, maxSplitLength);
    const totalParts = subSections.length;
    for (let i = 0; i < totalParts; i++) {
      const chunkSummary = summary.generateEnhancedSummary(section, outline, i + 1, totalParts);
      const partMarker = i === 0 ? '' : `<!-- Part ${i + 1}/${totalParts} -->\n`;
      result.push({
        summary: chunkSummary,
        content: `${headingLine}${partMarker}${subSections[i]}`
      });
    }
  }

  return result;
}

module.exports = {
  splitLongSection,
  processSections
};
