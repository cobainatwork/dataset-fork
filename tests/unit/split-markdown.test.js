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

  describe('minSplitLength brake: stops greedy merging across substantial top-level sections', () => {
    // Build 3 substantial sections; each section's body alone is ~3600 chars
    // (so the section block including heading is comfortably > 2500 = min).
    const body = '這是章節的內容文字段落。'.repeat(300); // ~3600 chars
    const SAMPLE = `# 五、傳承富足利率變動型終身壽險
${body}

# 六、金福利利率變動型終身壽險
${body}

# 七、金得利利率變動型增額終身壽險
${body}
`;
    // MAX 設成 < 整份總長度（3 個 section × ~3700 ≈ 11100 chars），讓 brake
    // 真正測「整份不能塞進 max → 拆 cross-chapter merge」這個設計用途；
    // 整份 ≤ max 的場景由「fits in single chunk when total ≤ max」覆蓋。
    const MIN = 2500;
    const MAX = 9000;
    const chunks = splitMarkdown(SAMPLE, MIN, MAX);

    it('produces one chunk per top-level section (3 chunks, not 1 or 2)', () => {
      expect(chunks.length).toBe(3);
    });

    it('each chunk contains exactly one of the three section headings', () => {
      const headings = ['# 五、傳承富足利率變動型終身壽險', '# 六、金福利利率變動型終身壽險', '# 七、金得利利率變動型增額終身壽險'];
      for (const h of headings) {
        const matches = chunks.filter(c => c.content.includes(h));
        expect(matches.length).toBe(1);
      }
    });

    it('still merges a tiny dangling section (< min) into its neighbour', () => {
      const big = '長段內容文字。'.repeat(400); // ~2800 chars > 2500
      const tiny = '附註：本條款適用全部產品。'; // very short, < 2500
      const text = `# A 章\n${big}\n\n# 附註\n${tiny}\n`;
      const r = splitMarkdown(text, 2500, 12000);
      // tiny section should NOT become its own chunk; brake only fires when
      // the NEXT section is also >= min.
      expect(r.length).toBe(1);
      expect(r[0].content).toContain('附註');
    });

    it('fits in single chunk when total ≤ max (brake must not fire on small docs)', () => {
      // 重現使用者實況：min=1000、max=20000、文件 ~6500 字、多個 # heading
      // 章節，其中至少一個 section 自身 ≥ min（如末段含大 details 區塊）。
      // 整份遠小於 max → brake 不該 fire，整份應保留為單一 chunk。
      const small = '段落內容文字。'.repeat(80); // ~480 chars
      const big = '段落內容文字。'.repeat(400);   // ~2800 chars (≥ min=1000，會觸發 brake 條件)
      const SAMPLE = `# 異常原因
Chrome 瀏覽器啟用 LNA 檢核機制更版導致企業網路銀行安控元件啟動異常。

## 一、網頁跳出下圖提示訊息
${small}

## 二、開啟區域網路存取權限
${small}

## 1. 找到設定位置
${small}

## 2. 點選設定
${small}

## 3. 點選隱私權和安全性
${small}

## 4. 網站設定下拉
${small}

## 7. 將 URL 加入自訂設定
${small}

## 8. 詳細的補充說明區塊
${big}
`;
      // 整份 ~6500 chars < max=20000；不論 brake 邏輯如何，整份都該 1 chunk
      const r = splitMarkdown(SAMPLE, 1000, 20000);
      expect(r.length).toBe(1);
    });
  });

  describe('Chinese-numbered headings (no `#` prefix) act as section boundaries', () => {
    const body = '這是章節的內容文字段落。'.repeat(300); // ~3600 chars
    const SAMPLE = `五、 傳承富足利率變動型終身壽險(NTIW1202)

${body}

六、 金福利利率變動型終身壽險(NTIW1602)

${body}

七、 金得利利率變動型增額終身壽險(NTIW1502)

${body}
`;
    // MAX 設成 < 整份總長度（3 × ~3700 ≈ 11100），讓 brake 真正測「整份超 max
    // 時拆 cross-chapter merge」；整份 ≤ max 場景由「fits in single chunk」覆蓋
    const chunks = splitMarkdown(SAMPLE, 2500, 9000);

    it('produces one chunk per Chinese-numbered section (3 chunks)', () => {
      expect(chunks.length).toBe(3);
    });

    it('each Chinese-numbered heading appears in exactly one chunk', () => {
      const headings = [
        '五、 傳承富足利率變動型終身壽險(NTIW1202)',
        '六、 金福利利率變動型終身壽險(NTIW1602)',
        '七、 金得利利率變動型增額終身壽險(NTIW1502)'
      ];
      for (const h of headings) {
        const matches = chunks.filter(c => c.content.includes(h));
        expect(matches.length).toBe(1);
      }
    });
  });

  describe('Chinese-numbered headings: splitLongSection respects boundary inside oversized parent', () => {
    // 整份文件無上層 # heading，但內含中文編號子章節；總長 > max 強制走
    // splitLongSection 路徑。splitLongSection 必須在中文編號 heading 邊界處主動煞車。
    const body = '段落內容文字。'.repeat(500); // ~3500 chars
    const SAMPLE = `五、 第一章標題

${body}

六、 第二章標題

${body}

七、 第三章標題

${body}
`;
    const chunks = splitMarkdown(SAMPLE, 1500, 5000);

    it('produces >= 3 chunks (splitLongSection respects Chinese-numbered boundary)', () => {
      expect(chunks.length).toBeGreaterThanOrEqual(3);
    });

    it('each Chinese-numbered heading appears in exactly one chunk', () => {
      const headings = ['五、 第一章標題', '六、 第二章標題', '七、 第三章標題'];
      for (const h of headings) {
        const matches = chunks.filter(c => c.content.includes(h));
        expect(matches.length).toBe(1);
      }
    });
  });

  describe('Chinese-numbered heading detection: false-positive guard', () => {
    it('does not treat inline "第五、" or "（五）" as section headings', () => {
      const body = '本條於 第五、 第六、 等款項中規定。'.repeat(200);
      const SAMPLE = `# 條文摘要\n${body}\n`;
      const r = splitMarkdown(SAMPLE, 1000, 20000);
      // 全文 < max，必為 1 chunk；若 false-positive 把「第五、」當 heading 會切多塊
      expect(r.length).toBe(1);
    });

    it('does not treat a long sentence starting with 一、 as heading', () => {
      const longSentence = '一、 此句雖以中文編號開頭但其後跟著很長的論述內容因此不應視為章節標題只是行文上的列舉序號而已長度超過八十字。';
      const trailing = '後續段落內容文字並足夠長以避免 detachTrailingHeading 干擾。'.repeat(20); // ~600 chars, 顯非 heading-like
      const SAMPLE = `# 父章\n${longSentence}\n\n${trailing}`;
      const r = splitMarkdown(SAMPLE, 1000, 20000);
      expect(r.length).toBe(1);
    });
  });
});
