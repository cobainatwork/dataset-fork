/**
 * Markdown文件分割模組
 */

/**
 * 分割超長段落
 * @param {Object} section - 段落物件
 * @param {number} maxSplitLength - 最大分割字數
 * @returns {Array} - 分割後的段落陣列
 */
function splitLongSection(section, maxSplitLength) {
  const content = section.content;
  const paragraphs = content.split(/\n\n+/);
  const result = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // 如果當前段落本身超過最大長度，可能需要進一步拆分
    if (paragraph.length > maxSplitLength) {
      // 如果當前塊不為空，先加入結果
      if (currentChunk.length > 0) {
        result.push(currentChunk);
        currentChunk = '';
      }

      // 對超長段落進行分割（例如，按句子或固定長度）
      const sentenceSplit = paragraph.match(/[^.!?。！？]+[.!?。！？]+/g) || [paragraph];

      // 處理分割後的句子
      let sentenceChunk = '';
      for (const sentence of sentenceSplit) {
        if ((sentenceChunk + sentence).length <= maxSplitLength) {
          sentenceChunk += sentence;
        } else {
          if (sentenceChunk.length > 0) {
            result.push(sentenceChunk);
          }
          // 如果單個句子超過最大長度，可能需要進一步拆分
          if (sentence.length > maxSplitLength) {
            // 簡單地按固定長度分割
            for (let i = 0; i < sentence.length; i += maxSplitLength) {
              result.push(sentence.substr(i, maxSplitLength));
            }
          } else {
            sentenceChunk = sentence;
          }
        }
      }

      if (sentenceChunk.length > 0) {
        currentChunk = sentenceChunk;
      }
    } else if ((currentChunk + '\n\n' + paragraph).length <= maxSplitLength) {
      // 如果添加當前段落不超過最大長度，則新增到當前塊
      currentChunk = currentChunk.length > 0 ? currentChunk + '\n\n' + paragraph : paragraph;
    } else {
      // 如果添加當前段落超過最大長度，則將當前塊加入結果，並重新開始一個新塊
      result.push(currentChunk);
      currentChunk = paragraph;
    }
  }

  // 新增最後一個塊（如果有）
  if (currentChunk.length > 0) {
    result.push(currentChunk);
  }

  return result;
}

/**
 * 處理段落，根據最小和最大分割字數進行分割
 * @param {Array} sections - 段落陣列
 * @param {Array} outline - 目錄大綱
 * @param {number} minSplitLength - 最小分割字數
 * @param {number} maxSplitLength - 最大分割字數
 * @returns {Array} - 處理後的段落陣列
 */
function processSections(sections, outline, minSplitLength, maxSplitLength) {
  // 預處理：將相鄰的小段落合併
  const preprocessedSections = [];
  let currentSection = null;

  for (const section of sections) {
    const contentLength = section.content.trim().length;

    if (contentLength < minSplitLength && currentSection) {
      // 如果當前段落小於最小長度且有累積段落，嘗試合併
      const mergedContent = `${currentSection.content}\n\n${section.heading ? `${'#'.repeat(section.level)} ${section.heading}\n` : ''}${section.content}`;

      if (mergedContent.length <= maxSplitLength) {
        // 如果合併後不超過最大長度，則合併
        currentSection.content = mergedContent;
        if (section.heading) {
          currentSection.headings = currentSection.headings || [];
          currentSection.headings.push({
            heading: section.heading,
            level: section.level,
            position: section.position
          });
        }
        continue;
      }
    }

    // 如果無法合併，則開始新的段落
    if (currentSection) {
      preprocessedSections.push(currentSection);
    }
    currentSection = {
      ...section,
      headings: section.heading ? [{ heading: section.heading, level: section.level, position: section.position }] : []
    };
  }

  // 新增最後一個段落
  if (currentSection) {
    preprocessedSections.push(currentSection);
  }

  const result = [];
  let accumulatedSection = null; // 用於累積小於最小分割字數的段落

  for (let i = 0; i < preprocessedSections.length; i++) {
    const section = preprocessedSections[i];
    const contentLength = section.content.trim().length;

    // 檢查是否需要累積段落
    if (contentLength < minSplitLength) {
      // 如果還沒有累積過段落，建立新的累積段落
      if (!accumulatedSection) {
        accumulatedSection = {
          heading: section.heading,
          level: section.level,
          content: section.content,
          position: section.position,
          headings: [{ heading: section.heading, level: section.level, position: section.position }]
        };
      } else {
        // 已經有累積段落，將當前段落新增到累積段落中
        accumulatedSection.content += `\n\n${section.heading ? `${'#'.repeat(section.level)} ${section.heading}\n` : ''}${section.content}`;
        if (section.heading) {
          accumulatedSection.headings.push({
            heading: section.heading,
            level: section.level,
            position: section.position
          });
        }
      }

      // 只有當累積內容達到最小長度時才處理
      const accumulatedLength = accumulatedSection.content.trim().length;
      if (accumulatedLength >= minSplitLength) {
        const summary = require('./summary').generateEnhancedSummary(accumulatedSection, outline);

        if (accumulatedLength > maxSplitLength) {
          // 如果累積段落超過最大長度，進一步分割
          const subSections = splitLongSection(accumulatedSection, maxSplitLength);

          for (let j = 0; j < subSections.length; j++) {
            result.push({
              summary: `${summary} - Part ${j + 1}/${subSections.length}`,
              content: subSections[j]
            });
          }
        } else {
          // 新增到結果中
          result.push({
            summary,
            content: accumulatedSection.content
          });
        }

        accumulatedSection = null; // 重置累積段落
      }

      continue;
    }

    // 如果有累積的段落，先處理它
    if (accumulatedSection) {
      const summary = require('./summary').generateEnhancedSummary(accumulatedSection, outline);
      const accumulatedLength = accumulatedSection.content.trim().length;

      if (accumulatedLength > maxSplitLength) {
        // 如果累積段落超過最大長度，進一步分割
        const { result: subSections, lastChunk } = splitLongSection(accumulatedSection, maxSplitLength, minSplitLength);

        for (let j = 0; j < subSections.length; j++) {
          result.push({
            summary: `${summary} - Part ${j + 1}/${subSections.length}`,
            content: subSections[j]
          });
        }

        // 如果有未處理的小段落，儲存下來等待下一次合併
        if (lastChunk) {
          accumulatedSection = {
            ...accumulatedSection,
            content: lastChunk
          };
          continue;
        }
      } else {
        // 新增到結果中
        result.push({
          summary,
          content: accumulatedSection.content
        });
      }

      accumulatedSection = null; // 重置累積段落
    }

    // 處理當前段落
    // 如果段落長度超過最大分割字數，需要進一步分割
    if (contentLength > maxSplitLength) {
      const subSections = splitLongSection(section, maxSplitLength);

      // 為當前段落建立一個標準的headings陣列
      if (!section.headings && section.heading) {
        section.headings = [{ heading: section.heading, level: section.level, position: section.position }];
      }

      for (let i = 0; i < subSections.length; i++) {
        const subSection = subSections[i];
        const summary = require('./summary').generateEnhancedSummary(section, outline, i + 1, subSections.length);

        result.push({
          summary,
          content: subSection
        });
      }
    } else {
      // 為當前段落建立一個標準的headings陣列
      if (!section.headings && section.heading) {
        section.headings = [{ heading: section.heading, level: section.level, position: section.position }];
      }

      // 生成增強的摘要並新增到結果
      const summary = require('./summary').generateEnhancedSummary(section, outline);

      const content = `${section.heading ? `${'#'.repeat(section.level)} ${section.heading}\n` : ''}${section.content}`;

      result.push({
        summary,
        content
      });
    }
  }

  // 處理最後剩餘的小段落
  if (accumulatedSection) {
    if (result.length > 0) {
      // 嘗試將剩餘的小段落與最後一個結果合併
      const lastResult = result[result.length - 1];
      const mergedContent = `${lastResult.content}\n\n${accumulatedSection.content}`;

      if (mergedContent.length <= maxSplitLength) {
        // 如果合併後不超過最大長度，則合併
        const summary = require('./summary').generateEnhancedSummary(
          {
            ...accumulatedSection,
            content: mergedContent
          },
          outline
        );

        result[result.length - 1] = {
          summary,
          content: mergedContent
        };
      } else {
        // 如果合併後超過最大長度，將accumulatedSection作為單獨的段落新增，這裡的contentLength一定小於maxSplitLength
        const summary = require('./summary').generateEnhancedSummary(accumulatedSection, outline);
        const content = `${accumulatedSection.heading ? `${'#'.repeat(accumulatedSection.level)} ${accumulatedSection.heading}\n` : ''}${accumulatedSection.content}`;
        result.push({
          summary,
          content
        });
      }
    } else {
      // 如果result為空，直接新增accumulatedSection
      const summary = require('./summary').generateEnhancedSummary(accumulatedSection, outline);
      const content = `${accumulatedSection.heading ? `${'#'.repeat(accumulatedSection.level)} ${accumulatedSection.heading}\n` : ''}${accumulatedSection.content}`;
      result.push({
        summary,
        content
      });
    }
  }

  return result;
}

module.exports = {
  splitLongSection,
  processSections
};
