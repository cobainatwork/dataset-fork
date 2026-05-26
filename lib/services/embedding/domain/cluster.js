function decideClusterAssignment({ matches, threshold, currentClusterFor }) {
  if (!matches.length || matches[0].score < threshold) {
    return { action: 'create' };
  }
  const top = matches[0];
  const existing = currentClusterFor(top.id);
  return {
    action: existing ? 'attach' : 'create',
    clusterId: existing || undefined,
    similarity: top.score,
    matchedQuestionId: top.id,
  };
}

function computeAvgSimilarity(similarities) {
  if (!similarities.length) return 0;
  return similarities.reduce((a, b) => a + b, 0) / similarities.length;
}

function promoteNewPrimary(members) {
  const sorted = [...members].sort((a, b) => a.createAt - b.createAt);
  return sorted[0]?.id;
}

function decideClusterUpdateOnMemberRemoval({ size }) {
  const newSize = Math.max(0, size - 1);
  return { shouldDelete: newSize <= 0, newSize };
}

/**
 * 增量更新 cluster 的平均相似度（running average）。
 * avgSimilarity 定義為「非 primary 成員的 similarityScore 平均」，
 * 因此 primary-only cluster (size 1) 的 avg 為 0。
 * @param {number} currentAvg - attach 前的 avgSimilarity
 * @param {number} currentSize - attach 前的 cluster size（含 primary）
 * @param {number} newSimilarity - 新 member 對 primary 的相似度
 */
function computeNextAvgSimilarity({ currentAvg, currentSize, newSimilarity }) {
  const oldMemberCount = Math.max(0, currentSize - 1);
  const sum = currentAvg * oldMemberCount + newSimilarity;
  return sum / (oldMemberCount + 1);
}

module.exports = {
  decideClusterAssignment,
  computeAvgSimilarity,
  promoteNewPrimary,
  decideClusterUpdateOnMemberRemoval,
  computeNextAvgSimilarity,
};
