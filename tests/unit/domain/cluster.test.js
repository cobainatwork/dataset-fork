const {
  decideClusterAssignment,
  computeAvgSimilarity,
  promoteNewPrimary,
  decideClusterUpdateOnMemberRemoval,
  computeNextAvgSimilarity,
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

  describe('decideClusterUpdateOnMemberRemoval', () => {
    it('returns shouldDelete=true when size will drop to 0', () => {
      const r = decideClusterUpdateOnMemberRemoval({ size: 1 });
      expect(r.shouldDelete).toBe(true);
      expect(r.newSize).toBe(0);
    });

    it('returns shouldDelete=false and newSize-1 when size > 1', () => {
      const r = decideClusterUpdateOnMemberRemoval({ size: 3 });
      expect(r.shouldDelete).toBe(false);
      expect(r.newSize).toBe(2);
    });

    it('handles size=2 by reducing to 1 (still keep cluster)', () => {
      const r = decideClusterUpdateOnMemberRemoval({ size: 2 });
      expect(r.shouldDelete).toBe(false);
      expect(r.newSize).toBe(1);
    });

    it('handles invalid size=0 defensively (shouldDelete=true)', () => {
      expect(decideClusterUpdateOnMemberRemoval({ size: 0 })).toEqual({
        shouldDelete: true,
        newSize: 0,
      });
    });

    it('clamps negative size to 0 (defensive against double-delete races)', () => {
      expect(decideClusterUpdateOnMemberRemoval({ size: -1 })).toEqual({
        shouldDelete: true,
        newSize: 0,
      });
    });
  });

  describe('computeNextAvgSimilarity', () => {
    it('first member sets avg to its own similarity (primary-only cluster has avg 0)', () => {
      // cluster currently has only primary (size 1, avg 0); attach 1st member sim 0.882
      const r = computeNextAvgSimilarity({ currentAvg: 0, currentSize: 1, newSimilarity: 0.882 });
      expect(r).toBeCloseTo(0.882);
    });

    it('second member averages with existing member similarity', () => {
      // size 2 (primary + 1 member avg 0.882); attach 2nd member sim 0.90
      const r = computeNextAvgSimilarity({ currentAvg: 0.882, currentSize: 2, newSimilarity: 0.9 });
      expect(r).toBeCloseTo((0.882 + 0.9) / 2);
    });

    it('third member keeps running average correct', () => {
      // size 3 (primary + 2 members avg 0.891); attach 3rd member sim 0.6
      const r = computeNextAvgSimilarity({ currentAvg: 0.891, currentSize: 3, newSimilarity: 0.6 });
      expect(r).toBeCloseTo((0.891 * 2 + 0.6) / 3);
    });
  });
});
