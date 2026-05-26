const { splitMarkdown } = require('@/lib/file/split-markdown');

const SAMPLE_MD = `# 文件標題

## 第一節 介紹
這是第一節的內容，包含若干句子用以說明這個段落的主題。本段不算太長也不算太短，屬於正常段落。

## 第二節 流程
這是第二節的內容。同樣是一段有實質內容的描述文字，涵蓋本節的主要重點與細節。

## 第三節 注意事項
這是第三節的內容。最後一段也是正常長度的文字，敘述本節的注意要點與相關提醒。
`;

function lastNonEmptyLine(content) {
  const lines = content.trim().split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.length ? lines[lines.length - 1] : '';
}

function isHeadingLine(line) {
  return /^#{1,6}\s/.test(line.trim());
}

describe('splitMarkdown — chunk boundaries align to markdown headings', () => {
  const chunks = splitMarkdown(SAMPLE_MD, 10, 1000);

  it('produces at least one chunk per heading section', () => {
    // 4 個 heading (# 文件標題, ## 第一節, ## 第二節, ## 第三節) → 至少 3 個 chunk
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });

  it('no chunk ends with a heading-only line (no trailing next-section heading)', () => {
    for (const chunk of chunks) {
      const last = lastNonEmptyLine(chunk.content);
      expect({ chunkPreview: chunk.content.slice(-80), last, isHeading: isHeadingLine(last) }).toMatchObject({
        isHeading: false
      });
    }
  });

  it('every chunk starts with its own heading line (when section has heading)', () => {
    for (const chunk of chunks) {
      const firstLine = chunk.content.trim().split('\n')[0];
      // chunk 開頭必須是 heading line（除了不可能 - sections 都有 heading）
      expect(isHeadingLine(firstLine)).toBe(true);
    }
  });

  it('a chunk does not contain another section heading in the middle', () => {
    // 抽取每個 chunk 的「主標題」（chunk 的第一個 heading）
    const mainHeadings = chunks.map(c => c.content.trim().split('\n')[0]);

    for (const chunk of chunks) {
      const lines = chunk.content.trim().split('\n');
      const own = lines[0];
      const otherHeadingsInside = lines.slice(1).filter(l => isHeadingLine(l) && mainHeadings.includes(l) && l !== own);
      expect(otherHeadingsInside).toEqual([]);
    }
  });
});
