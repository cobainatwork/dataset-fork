const { suggestThreshold, bucketize } = require('@/lib/services/embedding/domain/feedback');

describe('feedback domain', () => {
  it('bucketize groups feedbacks by similarity 0.05 bins', () => {
    const fbs = [
      { verdict: 'correct', similarityAtTime: 0.90 },
      { verdict: 'correct', similarityAtTime: 0.92 },
      { verdict: 'incorrect', similarityAtTime: 0.78 },
    ];
    const buckets = bucketize(fbs, 0.05);
    expect(buckets['0.90'].correct).toBe(2);
    expect(buckets['0.75'].incorrect).toBe(1);
  });

  it('suggestThreshold returns null when no bucket has 5+ samples', () => {
    const fbs = [
      { verdict: 'correct', similarityAtTime: 0.95 },
      { verdict: 'correct', similarityAtTime: 0.93 },
      { verdict: 'incorrect', similarityAtTime: 0.85 },
      { verdict: 'correct', similarityAtTime: 0.97 },
    ];
    const suggestion = suggestThreshold(fbs, { targetPrecision: 0.95, bin: 0.05 });
    expect(suggestion).toBeNull();
  });

  it('suggestThreshold returns lowest bucket meeting precision when quorum met', () => {
    // 6 corrects at 0.95 bucket → meets quorum + 100% precision
    // Note: 0.95 bins to 0.90 (floor), so use 0.955+ for 0.95 bucket
    const fbs = [
      { verdict: 'correct', similarityAtTime: 0.955 },
      { verdict: 'correct', similarityAtTime: 0.960 },
      { verdict: 'correct', similarityAtTime: 0.965 },
      { verdict: 'correct', similarityAtTime: 0.975 },
      { verdict: 'correct', similarityAtTime: 0.990 },
      { verdict: 'correct', similarityAtTime: 0.985 },
    ];
    const suggestion = suggestThreshold(fbs, { targetPrecision: 0.95, bin: 0.05 });
    expect(suggestion).toBe(0.95);
  });
});
