jest.mock('@/lib/db/index', () => ({
  db: {
    embeddingConfig: {
      upsert: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));

const { getConfig, saveConfig, DEFAULTS } = require('@/lib/services/embedding/config');
const { db } = require('@/lib/db/index');

describe('embedding config', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns DEFAULTS when no row exists', async () => {
    db.embeddingConfig.findUnique.mockResolvedValue(null);
    const cfg = await getConfig();
    expect(cfg.id).toBe('default');
    expect(cfg.dimension).toBe(1024);
    expect(cfg.clusterThreshold).toBe(0.88);
    expect(cfg.enabled).toBe(false);
  });

  it('returns saved row when one exists', async () => {
    db.embeddingConfig.findUnique.mockResolvedValue({
      id: 'default',
      modelName: 'bge-m3-q8_0',
      dimension: 1024,
      clusterThreshold: 0.9,
      enabled: true,
      endpoint: 'http://example.test/v1'
    });
    const cfg = await getConfig();
    expect(cfg.modelName).toBe('bge-m3-q8_0');
    expect(cfg.clusterThreshold).toBe(0.9);
    expect(cfg.enabled).toBe(true);
  });

  it('saveConfig upserts with merged DEFAULTS', async () => {
    db.embeddingConfig.upsert.mockResolvedValue({ id: 'default' });
    await saveConfig({ modelName: 'test-model', enabled: true });
    expect(db.embeddingConfig.upsert).toHaveBeenCalledWith({
      where: { id: 'default' },
      create: expect.objectContaining({
        id: 'default',
        modelName: 'test-model',
        enabled: true,
        dimension: 1024
      }),
      update: { modelName: 'test-model', enabled: true }
    });
  });
});
