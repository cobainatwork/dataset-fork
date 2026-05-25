/**
 * Markdown目錄提取模組
 */

/**
 * 提取Markdown文件的目錄結構
 * @param {string} text - Markdown文字
 * @param {Object} options - 配置選項
 * @param {number} options.maxLevel - 提取的最大標題級別，預設為6
 * @param {boolean} options.includeLinks - 是否包含錨點連結，預設為true
 * @param {boolean} options.flatList - 是否返回扁平列表，預設為false（返回巢狀結構）
 * @returns {Array} - 目錄結構陣列
 */
function extractTableOfContents(text, options = {}) {
  const { maxLevel = 6, includeLinks = true, flatList = false } = options;

  // 匹配標題的正則表示式
  const headingRegex = /^(#{1,6})\s+(.+?)(?:\s*\{#[\w-]+\})?\s*$/gm;
  const tocItems = [];
  let match;

  while ((match = headingRegex.exec(text)) !== null) {
    const level = match[1].length;

    // 如果標題級別超過了設定的最大級別，則跳過
    if (level > maxLevel) {
      continue;
    }

    const title = match[2].trim();
    const position = match.index;

    // 生成錨點ID（用於連結）
    const anchorId = generateAnchorId(title);

    tocItems.push({
      level,
      title,
      position,
      anchorId,
      children: []
    });
  }

  // 如果需要返回扁平列表，直接返回處理後的結果
  if (flatList) {
    return tocItems.map(item => {
      const result = {
        level: item.level,
        title: item.title,
        position: item.position
      };

      if (includeLinks) {
        result.link = `#${item.anchorId}`;
      }

      return result;
    });
  }

  // 構建巢狀結構
  return buildNestedToc(tocItems, includeLinks);
}

/**
 * 生成標題的錨點ID
 * @param {string} title - 標題文字
 * @returns {string} - 生成的錨點ID
 */
function generateAnchorId(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');
}

/**
 * 構建巢狀的目錄結構
 * @param {Array} items - 扁平的目錄項陣列
 * @param {boolean} includeLinks - 是否包含連結
 * @returns {Array} - 巢狀的目錄結構
 */
function buildNestedToc(items, includeLinks) {
  const result = [];
  const stack = [{ level: 0, children: result }];

  items.forEach(item => {
    const tocItem = {
      title: item.title,
      level: item.level,
      position: item.position,
      children: []
    };

    if (includeLinks) {
      tocItem.link = `#${item.anchorId}`;
    }

    // 找到當前項的父級
    while (stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    // 將當前項新增到父級的children中
    stack[stack.length - 1].children.push(tocItem);

    // 將當前項入棧
    stack.push(tocItem);
  });

  return result;
}

/**
 * 將目錄結構轉換為Markdown格式
 * @param {Array} toc - 目錄結構（巢狀或扁平）
 * @param {Object} options - 配置選項
 * @param {boolean} options.isNested - 是否為巢狀結構，預設為true
 * @param {boolean} options.includeLinks - 是否包含連結，預設為true
 * @returns {string} - Markdown格式的目錄
 */
function tocToMarkdown(toc, options = {}) {
  const { isNested = true, includeLinks = true } = options;

  if (isNested) {
    return nestedTocToMarkdown(toc, 0, includeLinks);
  } else {
    return flatTocToMarkdown(toc, includeLinks);
  }
}

/**
 * 將巢狀的目錄結構轉換為Markdown格式
 * @private
 */
function nestedTocToMarkdown(items, indent = 0, includeLinks) {
  let result = '';
  const indentStr = '  '.repeat(indent);

  // 新增資料驗證
  if (!Array.isArray(items)) {
    console.warn('Warning: items is not an array in nestedTocToMarkdown');
    return result;
  }

  items.forEach(item => {
    const titleText = includeLinks && item.link ? `[${item.title}](${item.link})` : item.title;

    result += `${indentStr}- ${titleText}\n`;

    if (item.children && item.children.length > 0) {
      result += nestedTocToMarkdown(item.children, indent + 1, includeLinks);
    }
  });

  return result;
}

/**
 * 將扁平的目錄結構轉換為Markdown格式
 * @private
 */
function flatTocToMarkdown(items, includeLinks) {
  let result = '';

  items.forEach(item => {
    const indent = '  '.repeat(item.level - 1);
    const titleText = includeLinks && item.link ? `[${item.title}](${item.link})` : item.title;

    result += `${indent}- ${titleText}\n`;
  });

  return result;
}

module.exports = {
  extractTableOfContents,
  tocToMarkdown
};
