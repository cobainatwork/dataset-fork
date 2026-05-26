/**
 * Markdown 文件分割模組
 *
 * 策略 C (合併到 max、邊界避開 trailing heading):
 *   - 累積多個 section 到一個 chunk，直到加入下一個 section 會超過
 *     maxSplitLength 才 push。同一份小文件 (總長 <= max) 不會被切。
 *   - push chunk 前先 detach 尾端的 heading-like 短行 (或 markdown
 *     heading)，讓那個短行 prepend 到下一個 chunk，確保 chunk 結尾
 *     永遠是實質內容、不會以下一節的標題收尾。
 *   - 過大的單一 section (> max) 仍會被 splitLongSection 切成多個
 *     sub-chunk，每個 sub-chunk 都帶 parent heading。
 *   - minSplitLength 參數保留 signature 但不再尊重 — chunk 大小由
 *     maxSplitLength 控制。
 */

const summary = require('./summary');

/**
 * 判斷一段文字是否為「視覺上的章節標題」(短、單行、無 HTML structural
 * tag)，或本身就是 markdown heading line。
 */
function isHeadingLike(p) {
  if (!p) return false;
  const t = p.trim();
  if (t.length === 0 || t.length > 100) return false;
  if (t.includes('\n')) return false;
  if (/<\/?(?:table|tr|td|th|tbody|thead|p|div|span|li|ul|ol|img|a|br)\b/i.test(t)) return false;
  return true;
}

/**
 * 從 chunk 字串尾端拆出 heading-like 短行 (若有)。回傳 { body, tail }，
 * caller 應把 body push 出去當前 chunk，tail prepend 到下一個 chunk。
 */
function detachTrailingHeading(chunkStr) {
  if (!chunkStr) return { body: '', tail: '' };
  const parts = chunkStr.split(/\n\n+/);
  if (parts.length < 2) return { body: chunkStr, tail: '' };
  const last = parts[parts.length - 1];
  if (isHeadingLike(last)) {
    return { body: parts.slice(0, -1).join('\n\n'), tail: last };
  }
  return { body: chunkStr, tail: '' };
}

/**
 * 分割超長段落
 */
function splitLongSection(section, maxSplitLength) {
  const content = section.content;
  const paragraphs = content.split(/\n\n+/);
  const result = [];
  let currentChunk = '';

  function pushAndStart(nextPiece) {
    const { body, tail } = detachTrailingHeading(currentChunk);
    if (body.length > 0) {
      result.push(body);
    }
    currentChunk = tail ? (nextPiece ? `${tail}\n\n${nextPiece}` : tail) : nextPiece || '';
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxSplitLength) {
      if (currentChunk.length > 0) {
        pushAndStart('');
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
      pushAndStart(paragraph);
    }
  }

  if (currentChunk.length > 0) {
    const { body, tail } = detachTrailingHeading(currentChunk);
    if (body.length > 0) result.push(body);
    if (tail.length > 0) result.push(tail);
  }

  return result;
}

/**
 * 處理段落 — 累積到 maxSplitLength 才切，邊界避開 trailing heading
 */
function processSections(sections, outline, _minSplitLength, maxSplitLength) {
  const result = [];
  let pending = '';
  let pendingMetaSection = null;

  function flushPending() {
    if (!pending.trim()) return;
    const { body, tail } = detachTrailingHeading(pending);
    if (body.trim()) {
      const metaForSummary = pendingMetaSection || { heading: null, level: 0 };
      const chunkSummary = summary.generateEnhancedSummary(metaForSummary, outline);
      result.push({ summary: chunkSummary, content: body.trim() });
    }
    pending = tail || '';
    pendingMetaSection = null;
  }

  for (const section of sections) {
    if (!section.headings && section.heading) {
      section.headings = [{ heading: section.heading, level: section.level, position: section.position }];
    }

    const trimmedContent = (section.content || '').trim();
    // 純標題、無內容：略過 (chunk 不該以下節標題收尾，且純 heading chunk 無語意)
    if (trimmedContent.length === 0) continue;

    const headingLine = section.heading
      ? `${'#'.repeat(section.level)} ${section.heading}\n`
      : '';
    const sectionBlock = `${headingLine}${trimmedContent}`;

    // 單一 section 超過 max → flush pending 後 splitLongSection 切多塊
    if (sectionBlock.length > maxSplitLength) {
      flushPending();
      const subs = splitLongSection({ ...section, content: sectionBlock }, maxSplitLength);
      for (let i = 0; i < subs.length; i++) {
        const partMarker = i === 0 ? '' : '';
        const chunkSummary = summary.generateEnhancedSummary(section, outline, i + 1, subs.length);
        result.push({ summary: chunkSummary, content: subs[i] });
      }
      continue;
    }

    // 嘗試把 sectionBlock 加進 pending；超過 max 就 flush 後重新開始
    const candidate = pending ? `${pending}\n\n${sectionBlock}` : sectionBlock;
    if (candidate.length <= maxSplitLength) {
      pending = candidate;
      if (!pendingMetaSection && section.heading) pendingMetaSection = section;
    } else {
      flushPending();
      pending = pending ? `${pending}\n\n${sectionBlock}` : sectionBlock;
      if (!pendingMetaSection) pendingMetaSection = section.heading ? section : null;
    }
  }
  flushPending();
  // 若 flushPending 後 pending 還有 leftover tail (heading-like)，
  // 它沒下個 chunk 可接，獨立成 chunk push 出去 (允許小 chunk)
  if (pending.trim()) {
    const chunkSummary = summary.generateEnhancedSummary({ heading: null, level: 0 }, outline);
    result.push({ summary: chunkSummary, content: pending.trim() });
  }

  return result;
}

module.exports = {
  splitLongSection,
  processSections
};
