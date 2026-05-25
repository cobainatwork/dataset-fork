/**
 * 摘要生成模組
 */

/**
 * 生成段落增強摘要，包含該段落中的所有標題
 * @param {Object} section - 段落物件
 * @param {Array} outline - 目錄大綱
 * @param {number} partIndex - 子段落索引（可選）
 * @param {number} totalParts - 子段落總數（可選）
 * @returns {string} - 生成的增強摘要
 */
function generateEnhancedSummary(section, outline, partIndex = null, totalParts = null) {
  // 如果是文件前言
  if ((!section.heading && section.level === 0) || (!section.headings && !section.heading)) {
    // 獲取文件標題（如果存在）
    const docTitle = outline.length > 0 && outline[0].level === 1 ? outline[0].title : '文件';
    return `${docTitle} 前言`;
  }

  // 如果有headings陣列，使用它
  if (section.headings && section.headings.length > 0) {
    // 按照級別和位置排序標題
    const sortedHeadings = [...section.headings].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.position - b.position;
    });

    // 構建所有標題包含的摘要
    const headingsMap = new Map(); // 用於去重

    // 首先處理每個標題，找到其完整路徑
    for (const heading of sortedHeadings) {
      // 跳過空標題
      if (!heading.heading) continue;

      // 查詢當前標題在大綱中的位置
      const headingIndex = outline.findIndex(item => item.title === heading.heading && item.level === heading.level);

      if (headingIndex === -1) {
        // 如果在大綱中找不到，直接使用當前標題
        headingsMap.set(heading.heading, heading.heading);
        continue;
      }

      // 查詢所有上級標題
      const pathParts = [];
      let parentLevel = heading.level - 1;

      for (let i = headingIndex - 1; i >= 0 && parentLevel > 0; i--) {
        if (outline[i].level === parentLevel) {
          pathParts.unshift(outline[i].title);
          parentLevel--;
        }
      }

      // 添加當前標題
      pathParts.push(heading.heading);

      // 生成完整路徑並存儲到Map中
      const fullPath = pathParts.join(' > ');
      headingsMap.set(fullPath, fullPath);
    }

    // 將所有標題路徑轉換為陣列並按間隔符數量排序（表示層級深度）
    const paths = Array.from(headingsMap.values()).sort((a, b) => {
      const aDepth = (a.match(/>/g) || []).length;
      const bDepth = (b.match(/>/g) || []).length;
      return aDepth - bDepth || a.localeCompare(b);
    });

    // 如果沒有有效的標題，返回預設摘要
    if (paths.length === 0) {
      return section.heading ? section.heading : '未命名段落';
    }

    // 如果是單個標題，直接返回
    if (paths.length === 1) {
      let summary = paths[0];
      // 如果是分段的部分，新增Part資訊
      if (partIndex !== null && totalParts > 1) {
        summary += ` - Part ${partIndex}/${totalParts}`;
      }
      return summary;
    }

    // 如果有多個標題，生成多標題摘要
    let summary = '';

    // 嘗試找到公共字首
    const firstPath = paths[0];
    const segments = firstPath.split(' > ');

    for (let i = 0; i < segments.length - 1; i++) {
      const prefix = segments.slice(0, i + 1).join(' > ');
      let isCommonPrefix = true;

      for (let j = 1; j < paths.length; j++) {
        if (!paths[j].startsWith(prefix + ' > ')) {
          isCommonPrefix = false;
          break;
        }
      }

      if (isCommonPrefix) {
        summary = prefix + ' > [';
        // 新增非公共部分
        for (let j = 0; j < paths.length; j++) {
          const uniquePart = paths[j].substring(prefix.length + 3); // +3 為 ' > ' 的長度
          summary += (j > 0 ? ', ' : '') + uniquePart;
        }
        summary += ']';
        break;
      }
    }

    // 如果沒有公共字首，使用完整列表
    if (!summary) {
      summary = paths.join(', ');
    }

    // 如果是分段的部分，新增Part資訊
    if (partIndex !== null && totalParts > 1) {
      summary += ` - Part ${partIndex}/${totalParts}`;
    }

    return summary;
  }

  // 相容舊邏輯，當沒有headings陣列時
  if (!section.heading && section.level === 0) {
    return '文件前言';
  }

  // 查詢當前段落在大綱中的位置
  const currentHeadingIndex = outline.findIndex(item => item.title === section.heading && item.level === section.level);

  if (currentHeadingIndex === -1) {
    return section.heading ? section.heading : '未命名段落';
  }

  // 查詢所有上級標題
  const parentHeadings = [];
  let parentLevel = section.level - 1;

  for (let i = currentHeadingIndex - 1; i >= 0 && parentLevel > 0; i--) {
    if (outline[i].level === parentLevel) {
      parentHeadings.unshift(outline[i].title);
      parentLevel--;
    }
  }

  // 構建摘要
  let summary = '';

  if (parentHeadings.length > 0) {
    summary = parentHeadings.join(' > ') + ' > ';
  }

  summary += section.heading;

  // 如果是分段的部分，新增Part資訊
  if (partIndex !== null && totalParts > 1) {
    summary += ` - Part ${partIndex}/${totalParts}`;
  }

  return summary;
}

/**
 * 舊的摘要生成函式，保留供相容性使用
 * @param {Object} section - 段落物件
 * @param {Array} outline - 目錄大綱
 * @param {number} partIndex - 子段落索引（可選）
 * @param {number} totalParts - 子段落總數（可選）
 * @returns {string} - 生成的摘要
 */
function generateSummary(section, outline, partIndex = null, totalParts = null) {
  return generateEnhancedSummary(section, outline, partIndex, totalParts);
}

module.exports = {
  generateEnhancedSummary,
  generateSummary
};
