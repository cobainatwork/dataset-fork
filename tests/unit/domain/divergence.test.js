const { classifyAnswers, pairwiseCosineAvg } = require('@/lib/services/embedding/domain/divergence');

describe('divergence', () => {
  it('returns consistent when answers similar', () => {
    expect(classifyAnswers({ avgSim: 0.85, divergenceThreshold: 0.70 })).toBe('consistent');
  });

  it('returns divergent when avgSim below threshold', () => {
    expect(classifyAnswers({ avgSim: 0.50, divergenceThreshold: 0.70 })).toBe('divergent');
  });

  it('returns redundant when avgSim >= 0.95', () => {
    expect(classifyAnswers({ avgSim: 0.97, divergenceThreshold: 0.70 })).toBe('redundant');
  });

  it('pairwiseCosineAvg computes average of all pairs', () => {
    const a = new Array(4).fill(1);
    const b = new Array(4).fill(1);
    const c = new Array(4).fill(0).map((_, i) => i === 0 ? 1 : 0);
    // <a,b> = 1.0, <a,c> = 0.5, <b,c> = 0.5
    // 3 pairs avg = (1.0 + 0.5 + 0.5) / 3 = 0.667
    expect(pairwiseCosineAvg([a, b, c])).toBeCloseTo(0.667, 2);
  });

  it('pairwiseCosineAvg returns 1.0 for single vector', () => {
    expect(pairwiseCosineAvg([new Array(4).fill(1)])).toBe(1.0);
  });
});
