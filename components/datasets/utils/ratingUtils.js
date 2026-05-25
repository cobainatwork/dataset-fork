/**
 * 評分相關的工具函式
 */

/**
 * 根據評分獲取對應的顏色和標籤（不包含國際化）
 * @param {number} score - 評分 (0-5)
 * @returns {object} - 包含顏色、背景色和標籤的物件
 */
export const getRatingConfig = score => {
  if (score >= 4.5) {
    return {
      color: '#2e7d32', // 深綠色
      backgroundColor: '#e8f5e8',
      label: '優秀',
      variant: 'excellent'
    };
  } else if (score >= 3.5) {
    return {
      color: '#388e3c', // 綠色
      backgroundColor: '#f1f8e9',
      label: '良好',
      variant: 'good'
    };
  } else if (score >= 2.5) {
    return {
      color: '#f57c00', // 橙色
      backgroundColor: '#fff3e0',
      label: '一般',
      variant: 'average'
    };
  } else if (score >= 1.5) {
    return {
      color: '#f44336', // 紅色
      backgroundColor: '#ffebee',
      label: '較差',
      variant: 'poor'
    };
  } else if (score > 0) {
    return {
      color: '#d32f2f', // 深紅色
      backgroundColor: '#ffebee',
      label: '很差',
      variant: 'very-poor'
    };
  } else {
    return {
      color: '#757575', // 灰色
      backgroundColor: '#f5f5f5',
      label: '未評分',
      variant: 'unrated'
    };
  }
};

/**
 * 根據評分獲取對應的顏色和國際化標籤
 * @param {number} score - 評分 (0-5)
 * @param {function} t - 國際化翻譯函式
 * @returns {object} - 包含顏色、背景色和國際化標籤的物件
 */
export const getRatingConfigI18n = (score, t) => {
  const baseConfig = getRatingConfig(score);

  // 根據variant獲取對應的翻譯鍵
  let translationKey;
  let fallbackText;

  switch (baseConfig.variant) {
    case 'excellent':
      translationKey = 'datasets.ratingExcellent';
      fallbackText = '優秀';
      break;
    case 'good':
      translationKey = 'datasets.ratingGood';
      fallbackText = '良好';
      break;
    case 'average':
      translationKey = 'datasets.ratingAverage';
      fallbackText = '一般';
      break;
    case 'poor':
      translationKey = 'datasets.ratingPoor';
      fallbackText = '較差';
      break;
    case 'very-poor':
      translationKey = 'datasets.ratingVeryPoor';
      fallbackText = '很差';
      break;
    case 'unrated':
      translationKey = 'datasets.ratingUnrated';
      fallbackText = '未評分';
      break;
    default:
      translationKey = 'datasets.ratingUnrated';
      fallbackText = '未評分';
  }

  return {
    ...baseConfig,
    label: t(translationKey, fallbackText)
  };
};

/**
 * 格式化評分顯示
 * @param {number} score - 評分
 * @returns {string} - 格式化後的評分字串
 */
export const formatScore = score => {
  if (score === 0) return '';
  return score.toFixed(1);
};

/**
 * 獲取評分範圍的描述
 * @param {number} score - 評分
 * @returns {string} - 評分範圍描述
 */
export const getScoreDescription = score => {
  const config = getRatingConfig(score);
  return `${formatScore(score)} - ${config.label}`;
};

/**
 * 評分範圍常量
 */
export const SCORE_RANGES = {
  EXCELLENT: { min: 4.5, max: 5.0, label: '優秀' },
  GOOD: { min: 3.5, max: 4.4, label: '良好' },
  AVERAGE: { min: 2.5, max: 3.4, label: '一般' },
  POOR: { min: 1.5, max: 2.4, label: '較差' },
  VERY_POOR: { min: 0.1, max: 1.4, label: '很差' },
  UNRATED: { min: 0, max: 0, label: '未評分' }
};
