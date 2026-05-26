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

describe('splitLongSection — heading-like short line stays with next chunk', () => {
  // 模擬實際 PDF 轉 HTML table 場景：無 markdown heading，含視覺章節分隔短句
  const TABLE_A = '<table>' + '<tr><td>A 內容欄位</td></tr>'.repeat(40) + '</table>';
  const TABLE_B = '<table>' + '<tr><td>B 內容欄位</td></tr>'.repeat(40) + '</table>';
  const sample = `${TABLE_A}\n\n申請各項理賠給付應檢附文件\n\n${TABLE_B}`;
  // max 設成略大於 TABLE_A 長度，迫使 splitter 在 TABLE_A 之後切
  const max = TABLE_A.length + 50;
  const chunks = splitMarkdown(sample, 10, max);

  it('produces at least 2 chunks', () => {
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it('the short heading-like line stays with the next chunk, not the previous one', () => {
    // 找到含「申請各項理賠給付應檢附文件」的 chunk
    const containingChunks = chunks.filter(c => c.content.includes('申請各項理賠給付應檢附文件'));
    expect(containingChunks.length).toBe(1);
    const chunk = containingChunks[0];

    // 該行應該在 chunk 的開頭區（不是尾巴）
    const lines = chunk.content.split(/\n+/).map(l => l.trim()).filter(Boolean);
    const idx = lines.findIndex(l => l === '申請各項理賠給付應檢附文件');
    expect(idx).toBeGreaterThanOrEqual(0);

    // assertion 重點：該短行不應是 chunk 尾巴
    expect(idx).toBeLessThan(lines.length - 1);

    // 且該短行之後應該緊接著 <table>（內容）
    expect(lines.slice(idx + 1).join(' ')).toContain('<table>');
  });
});
