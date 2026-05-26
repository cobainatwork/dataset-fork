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

module.exports = { decideClusterAssignment, computeAvgSimilarity, promoteNewPrimary };
