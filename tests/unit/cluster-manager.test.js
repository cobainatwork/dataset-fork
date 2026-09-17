/**
 * ClusterManager unit 測試（C4）：全部走 fake adapter，不需 Postgres。
 * seam：createClusterManager({ clusterRepo, questionStore, vectorStore })
 *
 * 契約：呼叫端在呼叫前已刪除該 question row，removeMember 讀「剩餘 members」
 * 計算 size（authoritative），因此 batch 多題同刪不會重複減一。
 */
const { createClusterManager } = require('@/lib/services/embedding/cluster-manager');
const { OptimisticLockError } = require('@/lib/services/embedding/errors');

function makeFakeClusterRepo(seed = {}) {
  const clusters = new Map(Object.entries(seed).map(([id, c]) => [id, { ...c }]));
  let lockFailuresLeft = 0;
  const calls = { updates: [], deletes: [] };
  return {
    clusters,
    calls,
    setLockFailures(n) { lockFailuresLeft = n; },
    async findById(id) {
      const c = clusters.get(id);
      return c ? { ...c } : null;
    },
    async update(id, patch) {
      const { version, ...fields } = patch;
      const c = clusters.get(id);
      if (!c || c.version !== version) throw new OptimisticLockError(`cluster ${id} version mismatch`);
      if (lockFailuresLeft > 0) { lockFailuresLeft--; throw new OptimisticLockError(`cluster ${id} version mismatch`); }
      Object.assign(c, fields, { version: c.version + 1 });
      calls.updates.push({ id, fields });
    },
    async delete(id, version) {
      const c = clusters.get(id);
      if (!c || c.version !== version) throw new OptimisticLockError(`cluster ${id} version mismatch on delete`);
      if (lockFailuresLeft > 0) { lockFailuresLeft--; throw new OptimisticLockError(`cluster ${id} version mismatch on delete`); }
      clusters.delete(id);
      calls.deletes.push(id);
    },
  };
}

// membersByCluster: { clusterId: [{ id, createAt }, ...] }，呼叫端刪 row 後
// 用 removeMember 前的真實剩餘集。
function makeFakeQuestionStore(membersByCluster = {}) {
  const byCluster = new Map(Object.entries(membersByCluster).map(([k, v]) => [k, v.map(m => ({ ...m }))]));
  return {
    byCluster,
    dropMember(clusterId, questionId) {
      const list = byCluster.get(clusterId);
      if (!list) return;
      byCluster.set(clusterId, list.filter(m => m.id !== questionId));
    },
    async findClusterMembers(clusterId) {
      return (byCluster.get(clusterId) || []).map(m => ({ ...m }));
    },
  };
}

function makeFakeVectorStore() {
  const calls = { deleted: [] };
  return {
    calls,
    async deletePoints(sourceType, ids) {
      calls.deleted.push({ sourceType, ids: [...ids] });
    },
  };
}

function build({ repo, store, vs }) {
  return createClusterManager({
    clusterRepo: repo,
    questionStore: store,
    vectorStore: vs,
  });
}

describe('clusterManager.removeMember (fake adapters)', () => {
  it('deletes the question vector even when there is no cluster', async () => {
    const vs = makeFakeVectorStore();
    const manager = build({ repo: makeFakeClusterRepo(), store: makeFakeQuestionStore(), vs });

    await manager.removeMember({ questionId: 'q1', clusterId: null });

    expect(vs.calls.deleted).toEqual([{ sourceType: 'question', ids: ['q1'] }]);
  });

  it('deletes the cluster when the last member leaves', async () => {
    const repo = makeFakeClusterRepo({ c1: { id: 'c1', primaryQuestionId: 'q1', size: 1, version: 0 } });
    const store = makeFakeQuestionStore({ c1: [] }); // q1 已刪，無剩餘
    const vs = makeFakeVectorStore();
    const manager = build({ repo, store, vs });

    await manager.removeMember({ questionId: 'q1', clusterId: 'c1' });

    expect(repo.calls.deletes).toEqual(['c1']);
    expect(repo.calls.updates).toEqual([]);
    expect(repo.clusters.has('c1')).toBe(false);
  });

  it('decrements size when a non-primary member leaves', async () => {
    const repo = makeFakeClusterRepo({ c1: { id: 'c1', primaryQuestionId: 'q0', size: 3, version: 0 } });
    const store = makeFakeQuestionStore({
      c1: [
        { id: 'q0', createAt: 1 },
        { id: 'q2', createAt: 3 },
      ],
    });
    const manager = build({ repo, store, vs: makeFakeVectorStore() });

    await manager.removeMember({ questionId: 'q1', clusterId: 'c1' });

    expect(repo.calls.updates).toEqual([
      { id: 'c1', fields: { size: 2 } },
    ]);
    expect(repo.clusters.get('c1')).toMatchObject({ size: 2, primaryQuestionId: 'q0', version: 1 });
  });

  it('promotes a new primary when the primary leaves', async () => {
    const repo = makeFakeClusterRepo({ c1: { id: 'c1', primaryQuestionId: 'q0', size: 3, version: 0 } });
    // q0（primary）已刪，剩 q2/t3、q1/t2 → 最早 q1 升 primary
    const store = makeFakeQuestionStore({
      c1: [
        { id: 'q2', createAt: 3 },
        { id: 'q1', createAt: 2 },
      ],
    });
    const manager = build({ repo, store, vs: makeFakeVectorStore() });

    await manager.removeMember({ questionId: 'q0', clusterId: 'c1' });

    expect(repo.clusters.get('c1')).toMatchObject({ size: 2, primaryQuestionId: 'q1', version: 1 });
  });

  it('keeps the primary unchanged when a non-primary leaves', async () => {
    const repo = makeFakeClusterRepo({ c1: { id: 'c1', primaryQuestionId: 'q0', size: 2, version: 0 } });
    const store = makeFakeQuestionStore({ c1: [{ id: 'q0', createAt: 1 }] });
    const manager = build({ repo, store, vs: makeFakeVectorStore() });

    await manager.removeMember({ questionId: 'q1', clusterId: 'c1' });

    expect(repo.calls.updates).toEqual([{ id: 'c1', fields: { size: 1 } }]);
    expect(repo.clusters.get('c1').primaryQuestionId).toBe('q0');
  });

  it('computes size from the authoritative remaining count across a batch', async () => {
    // size-3 cluster（q0 primary, q1, q2）一次刪 q1、q2 → 剩 1，不是各減一後各自判斷
    const repo = makeFakeClusterRepo({ c1: { id: 'c1', primaryQuestionId: 'q0', size: 3, version: 0 } });
    const store = makeFakeQuestionStore({
      c1: [
        { id: 'q0', createAt: 1 },
        { id: 'q1', createAt: 2 },
        { id: 'q2', createAt: 3 },
      ],
    });
    const manager = build({ repo, store, vs: makeFakeVectorStore() });

    // 模擬 batchDelete：先刪 row（dropMember）再收斂 cluster
    store.dropMember('c1', 'q1');
    await manager.removeMember({ questionId: 'q1', clusterId: 'c1' });
    store.dropMember('c1', 'q2');
    await manager.removeMember({ questionId: 'q2', clusterId: 'c1' });

    expect(repo.clusters.get('c1')).toMatchObject({ size: 1, primaryQuestionId: 'q0' });
  });

  it('deletes the cluster when a batch empties it', async () => {
    const repo = makeFakeClusterRepo({ c1: { id: 'c1', primaryQuestionId: 'q0', size: 2, version: 0 } });
    const store = makeFakeQuestionStore({
      c1: [
        { id: 'q0', createAt: 1 },
        { id: 'q1', createAt: 2 },
      ],
    });
    const manager = build({ repo, store, vs: makeFakeVectorStore() });

    store.dropMember('c1', 'q0');
    await manager.removeMember({ questionId: 'q0', clusterId: 'c1' }); // 剩 q1 → promote
    store.dropMember('c1', 'q1');
    await manager.removeMember({ questionId: 'q1', clusterId: 'c1' }); // 剩 0 → delete

    expect(repo.calls.deletes).toEqual(['c1']);
    expect(repo.clusters.has('c1')).toBe(false);
  });

  it('is a no-op when the cluster has already been removed', async () => {
    const repo = makeFakeClusterRepo({}); // 無 c1
    const store = makeFakeQuestionStore({ c1: [] });
    const vs = makeFakeVectorStore();
    const manager = build({ repo, store, vs });

    await manager.removeMember({ questionId: 'q1', clusterId: 'c1' });

    expect(vs.calls.deleted).toEqual([{ sourceType: 'question', ids: ['q1'] }]);
    expect(repo.calls.updates).toEqual([]);
    expect(repo.calls.deletes).toEqual([]);
  });

  it('retries the update on optimistic lock conflict and re-reads fresh state', async () => {
    const repo = makeFakeClusterRepo({ c1: { id: 'c1', primaryQuestionId: 'q0', size: 3, version: 0 } });
    repo.setLockFailures(2);
    const store = makeFakeQuestionStore({
      c1: [
        { id: 'q0', createAt: 1 },
        { id: 'q2', createAt: 3 },
      ],
    });
    const manager = build({ repo, store, vs: makeFakeVectorStore() });

    await manager.removeMember({ questionId: 'q1', clusterId: 'c1' });

    expect(repo.clusters.get('c1')).toMatchObject({ size: 2, version: 1 });
  });

  it('throws when optimistic lock retries are exhausted', async () => {
    const repo = makeFakeClusterRepo({ c1: { id: 'c1', primaryQuestionId: 'q0', size: 3, version: 0 } });
    repo.setLockFailures(99);
    const store = makeFakeQuestionStore({
      c1: [
        { id: 'q0', createAt: 1 },
        { id: 'q2', createAt: 3 },
      ],
    });
    const manager = build({ repo, store, vs: makeFakeVectorStore() });

    await expect(manager.removeMember({ questionId: 'q1', clusterId: 'c1' })).rejects.toThrow(/optimistic lock/i);
  });
});
