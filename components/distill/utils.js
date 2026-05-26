'use client';

/**
 * 按照標籤前面的序號對標籤進行排序
 * @param {Array} tags - 標籤陣列
 * @returns {Array} 排序後的標籤陣列
 */
export const sortTagsByNumber = tags => {
  return [...tags].sort((a, b) => {
    // 提取標籤前面的序號
    const getNumberPrefix = label => {
      // 匹配形如 1, 1.1, 1.1.2 的序號
      const match = label.match(/^([\d.]+)\s/);
      if (match) {
        return match[1]; // 返回完整的序號字串，如 "1.10"
      }
      return null; // 沒有序號
    };

    const aPrefix = getNumberPrefix(a.label);
    const bPrefix = getNumberPrefix(b.label);

    // 如果兩個標籤都有序號，按序號比較
    if (aPrefix && bPrefix) {
      // 將序號分解為陣列，然後按數值比較
      const aParts = aPrefix.split('.').map(num => parseInt(num, 10));
      const bParts = bPrefix.split('.').map(num => parseInt(num, 10));

      // 比較序號陣列
      for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
        if (aParts[i] !== bParts[i]) {
          return aParts[i] - bParts[i]; // 數值比較，確保 1.2 排在 1.10 前面
        }
      }
      // 如果前面的數字都相同，則較短的序號在前
      return aParts.length - bParts.length;
    }
    // 如果只有一個標籤有序號，則有序號的在前
    else if (aPrefix) {
      return -1;
    } else if (bPrefix) {
      return 1;
    }
    // 如果都沒有序號，則按原來的字母序排序
    else {
      return a.label.localeCompare(b.label, 'zh-TW');
    }
  });
};

/**
 * 獲取標籤的完整路徑
 * @param {Object} tag - 標籤物件
 * @param {Array} allTags - 所有標籤陣列
 * @returns {string} 標籤路徑，如 "標籤1 > 標籤2 > 標籤3"
 */
export const getTagPath = (tag, allTags) => {
  if (!tag) return '';

  const findPath = (currentTag, path = []) => {
    const newPath = [currentTag.label, ...path];

    if (!currentTag.parentId) return newPath;

    const parentTag = allTags.find(t => t.id === currentTag.parentId);
    if (!parentTag) return newPath;

    return findPath(parentTag, newPath);
  };

  return findPath(tag).join(' > ');
};
