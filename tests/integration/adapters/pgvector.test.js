const { PrismaClient } = require('@prisma/client');
const { createPgvectorStore } = require('@/lib/services/embedding/adapters/pgvector');

const prisma = new PrismaClient();
const store = createPgvectorStore(prisma);

describe('pgvector store (integration)', () => {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM "Embeddings"`);
  });

  afterAll(() => prisma.$disconnect());

  function fakeVec(n = 1024, fill = 0.1) {
    return new Array(n).fill(fill);
  }

  it('upserts and searches', async () => {
    await store.upsert('question', [
      { id: 'q1', vector: fakeVec(1024, 0.5), payload: { projectId: 'p1' } },
      { id: 'q2', vector: fakeVec(1024, 0.5).map((_, i) => i === 0 ? 0.6 : 0.5), payload: { projectId: 'p1' } },
    ]);
    const matches = await store.search('question', fakeVec(1024, 0.5), { top: 5 });
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches[0].score).toBeCloseTo(1.0, 2);
  });

  it('upsert is idempotent on same id', async () => {
    await store.upsert('question', [{ id: 'q3', vector: fakeVec(), payload: {} }]);
    await store.upsert('question', [{ id: 'q3', vector: fakeVec(), payload: {} }]);
    const c = await store.count('question', {});
    expect(c).toBe(1);
  });

  it('separates question and answer collections via partial index', async () => {
    await store.upsert('question', [{ id: 'q5', vector: fakeVec(), payload: {} }]);
    await store.upsert('answer', [{ id: 'd5', vector: fakeVec(), payload: {} }]);
    const qm = await store.search('question', fakeVec(), { top: 5 });
    expect(qm.find(m => m.id === 'd5')).toBeUndefined();
  });
});
