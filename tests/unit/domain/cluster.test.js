const {
  decideClusterAssignment,
  computeAvgSimilarity,
  promoteNewPrimary,
} = require('@/lib/services/embedding/domain/cluster');

describe('cluster domain', () => {
  describe('decideClusterAssignment', () => {
    it('assigns to existing cluster when top match >= threshold', () => {
      const matches = [{ id: 'q5', score: 0.92 }, { id: 'q7', score: 0.80 }];
      const r = decideClusterAssignment({ matches, threshold: 0.88, currentClusterFor: (id) => 'c1' });
      expect(r.action).toBe('attach');
      expect(r.clusterId).toBe('c1');
      expect(r.similarity).toBe(0.92);
    });

    it('creates new cluster when top match < threshold', () => {
      const matches = [{ id: 'q5', score: 0.50 }];
      const r = decideClusterAssignment({ matches, threshold: 0.88, currentClusterFor: () => null });
      expect(r.action).toBe('create');
    });

    it('creates new cluster when no matches', () => {
      const r = decideClusterAssignment({ matches: [], threshold: 0.88, currentClusterFor: () => null });
      expect(r.action).toBe('create');
    });

    it('attaches to top match cluster even if other matches have own cluster', () => {
      const matches = [
        { id: 'q1', score: 0.95 },
        { id: 'q2', score: 0.91 },
      ];
      const r = decideClusterAssignment({
        matches, threshold: 0.88,
        currentClusterFor: (id) => id === 'q1' ? 'cA' : 'cB',
      });
      expect(r.clusterId).toBe('cA');
    });
  });

  describe('computeAvgSimilarity', () => {
    it('returns mean of similarities', () => {
      expect(computeAvgSimilarity([0.9, 0.8, 0.7])).toBeCloseTo(0.8);
    });
    it('returns 0 for empty', () => {
      expect(computeAvgSimilarity([])).toBe(0);
    });
  });

  describe('promoteNewPrimary', () => {
    it('picks earliest member as new primary', () => {
      const members = [
        { id: 'q3', createAt: new Date('2026-01-03') },
        { id: 'q1', createAt: new Date('2026-01-01') },
        { id: 'q2', createAt: new Date('2026-01-02') },
      ];
      expect(promoteNewPrimary(members)).toBe('q1');
    });
  });
});
