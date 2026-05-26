const { splitMarkdown } = require('@/lib/file/split-markdown');

function lastNonEmptyLine(content) {
  const lines = content.trim().split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.length ? lines[lines.length - 1] : '';
}

function isHeadingLine(line) {
  return /^#{1,6}\s/.test(line.trim());
}

describe('splitMarkdown — chunk boundaries (strategy C: merge until max, no trailing heading)', () => {
  describe('small doc with multiple headings fits in one chunk', () => {
    const SAMPLE = `# 病歷資料調閱授權書
這是文件開頭的說明文字，介紹本授權書的目的與適用對象。

# 一、事故人基本資料
姓名、出生日期、身分證字號等基本欄位由填表人手寫。

# 二、查閱範圍
就診紀錄、住院摘要、檢驗報告等可勾選項目。

# 三、有效期間
本授權書自簽署日起六個月內有效。
`;
    const chunks = splitMarkdown(SAMPLE, 10, 5000);

    it('produces exactly 1 chunk (max not exceeded → keep together)', () => {
      expect(chunks.length).toBe(1);
    });

    it('the single chunk contains all 4 section headings', () => {
      const c = chunks[0].content;
      expect(c).toContain('# 病歷資料調閱授權書');
      expect(c).toContain('# 一、事故人基本資料');
      expect(c).toContain('# 二、查閱範圍');
      expect(c).toContain('# 三、有效期間');
    });
  });

  describe('large doc forces splitting; boundaries respect content', () => {
    const longContent = '這是某節的內容文字。'.repeat(40); // ~400 字
    const SAMPLE = `# 第一節
${longContent}

# 第二節
${longContent}

# 第三節
${longContent}
`;
    const chunks = splitMarkdown(SAMPLE, 10, 600);

    it('produces multiple chunks when total exceeds max', () => {
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });

    it('no chunk ends with a markdown heading line', () => {
      for (const chunk of chunks) {
        const last = lastNonEmptyLine(chunk.content);
        expect({ preview: chunk.content.slice(-60), last, isHeading: isHeadingLine(last) }).toMatchObject({
          isHeading: false
        });
      }
    });

    it('every chunk starts with a heading line', () => {
      for (const chunk of chunks) {
        const firstLine = chunk.content.trim().split('\n')[0];
        expect(isHeadingLine(firstLine)).toBe(true);
      }
    });
  });

  describe('PDF-converted doc with no markdown heading (HTML tables + heading-like short line)', () => {
    const TABLE_A = '<table>' + '<tr><td>A 內容欄位</td></tr>'.repeat(40) + '</table>';
    const TABLE_B = '<table>' + '<tr><td>B 內容欄位</td></tr>'.repeat(40) + '</table>';
    const sample = `${TABLE_A}\n\n申請各項理賠給付應檢附文件\n\n${TABLE_B}`;
    const max = TABLE_A.length + 50;
    const chunks = splitMarkdown(sample, 10, max);

    it('produces at least 2 chunks', () => {
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });

    it('the short heading-like line stays with the next chunk, not the previous one', () => {
      const containingChunks = chunks.filter(c => c.content.includes('申請各項理賠給付應檢附文件'));
      expect(containingChunks.length).toBe(1);
      const chunk = containingChunks[0];

      const lines = chunk.content.split(/\n+/).map(l => l.trim()).filter(Boolean);
      const idx = lines.findIndex(l => l === '申請各項理賠給付應檢附文件');
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(lines.length - 1);
      expect(lines.slice(idx + 1).join(' ')).toContain('<table>');
    });
  });
});
