function bucketize(feedbacks, bin = 0.05) {
  const out = {};
  for (const fb of feedbacks) {
    const key = (Math.floor(fb.similarityAtTime / bin) * bin).toFixed(2);
    if (!out[key]) out[key] = { correct: 0, incorrect: 0, partial: 0 };
    out[key][fb.verdict]++;
  }
  return out;
}

function suggestThreshold(feedbacks, { targetPrecision = 0.95, bin = 0.05 } = {}) {
  const buckets = bucketize(feedbacks, bin);
  const sorted = Object.keys(buckets).sort();
  for (const k of sorted) {
    const b = buckets[k];
    const total = b.correct + b.incorrect + (b.partial || 0);
    if (total >= 5 && b.correct / total >= targetPrecision) {
      return parseFloat(k);
    }
  }
  return null;
}

module.exports = { bucketize, suggestThreshold };
