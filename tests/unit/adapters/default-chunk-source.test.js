jest.mock('@/lib/db/index', () => ({
  db: { chunks: { findMany: jest.fn(), findUnique: jest.fn() } },
}));

const { createDefaultChunkSource } = require('@/lib/services/embedding/adapters/default-chunk-source');
const { db } = require('@/lib/db/index');

describe('DefaultChunkSource', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listChunks returns all chunks for a project', async () => {
    db.chunks.findMany.mockResolvedValue([
      { id: 'c1', projectId: 'p1', content: 'hello' },
      { id: 'c2', projectId: 'p1', content: 'world' },
    ]);
    const src = createDefaultChunkSource();
    const chunks = await src.listChunks('p1');
    expect(chunks.length).toBe(2);
    expect(db.chunks.findMany).toHaveBeenCalledWith({ where: { projectId: 'p1' } });
  });

  it('getChunk returns a single chunk', async () => {
    db.chunks.findUnique.mockResolvedValue({ id: 'c1', projectId: 'p1', content: 'hello' });
    const src = createDefaultChunkSource();
    const c = await src.getChunk('c1');
    expect(c.id).toBe('c1');
    expect(c.text).toBe('hello');
  });

  it('getChunk returns null for missing chunk', async () => {
    db.chunks.findUnique.mockResolvedValue(null);
    const src = createDefaultChunkSource();
    const c = await src.getChunk('does-not-exist');
    expect(c).toBeNull();
  });
});
