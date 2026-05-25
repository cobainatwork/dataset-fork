function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function norm(a) {
  return Math.sqrt(dot(a, a));
}
function cosine(a, b) {
  const d = norm(a) * norm(b);
  if (d === 0) return 0;
  return dot(a, b) / d;
}

function pairwiseCosineAvg(vectors) {
  if (vectors.length <= 1) return 1.0;
  let total = 0;
  let pairs = 0;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      total += cosine(vectors[i], vectors[j]);
      pairs++;
    }
  }
  return total / pairs;
}

function classifyAnswers({ avgSim, divergenceThreshold }) {
  if (avgSim >= 0.95) return 'redundant';
  if (avgSim < divergenceThreshold) return 'divergent';
  return 'consistent';
}

module.exports = { classifyAnswers, pairwiseCosineAvg };
