const { createOpenAICompatibleProvider } = require('@/lib/services/embedding/adapters/openai-compatible');

global.fetch = jest.fn();

describe('openai-compatible provider', () => {
  beforeEach(() => fetch.mockReset());

  it('embeds a single text', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ embedding: new Array(1024).fill(0.5) }]
        })
    });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://localhost:11434/v1',
      apiKey: '',
      modelName: 'bge-m3',
      dimension: 1024
    });
    const vec = await provider.embed('hello');
    expect(vec.length).toBe(1024);
    expect(vec[0]).toBeCloseTo(0.5);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/v1/embeddings',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('healthCheck returns true on /models 200', async () => {
    fetch.mockResolvedValue({ ok: true });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://localhost:11434/v1',
      apiKey: '',
      modelName: 'bge-m3',
      dimension: 1024
    });
    await expect(provider.healthCheck()).resolves.toBe(true);
  });

  it('healthCheck returns false on /models 5xx', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://localhost:11434/v1',
      apiKey: '',
      modelName: 'bge-m3',
      dimension: 1024
    });
    await expect(provider.healthCheck()).resolves.toBe(false);
  });

  it('sets Authorization header when apiKey provided', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: [0, 1, 2] }] })
    });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://example.test/v1',
      apiKey: 'secret-key-abc',
      modelName: 'test-model',
      dimension: 3
    });
    await provider.embed('hi');
    const call = fetch.mock.calls[0];
    expect(call[1].headers).toMatchObject({ Authorization: 'Bearer secret-key-abc' });
  });

  it('omits Authorization header when apiKey is empty', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ embedding: [0, 1, 2] }] })
    });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://example.test/v1',
      apiKey: '',
      modelName: 'test-model',
      dimension: 3
    });
    await provider.embed('hi');
    const call = fetch.mock.calls[0];
    expect(call[1].headers.Authorization).toBeUndefined();
  });

  it('throws on empty data array response', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://example.test/v1',
      apiKey: '',
      modelName: 'test-model',
      dimension: 3
    });
    await expect(provider.embed('hi')).rejects.toThrow('empty result');
  });

  it('throws on malformed API response missing data field', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: [] })
    });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://example.test/v1',
      apiKey: '',
      modelName: 'test-model',
      dimension: 3
    });
    await expect(provider.embed('hi')).rejects.toThrow('empty result');
  });

  it('throws on malformed embedding object', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [{ result: [0, 1, 2] }] })
    });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://example.test/v1',
      apiKey: '',
      modelName: 'test-model',
      dimension: 3
    });
    await expect(provider.embed('hi')).rejects.toThrow('malformed embedding');
  });

  it('embedBatch handles multiple texts', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [{ embedding: [0.1, 0.2] }, { embedding: [0.3, 0.4] }]
        })
    });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://example.test/v1',
      apiKey: '',
      modelName: 'test-model',
      dimension: 2
    });
    const vecs = await provider.embedBatch(['text1', 'text2']);
    expect(vecs).toHaveLength(2);
    expect(vecs[0][0]).toBeCloseTo(0.1);
    expect(vecs[1][1]).toBeCloseTo(0.4);
    const call = fetch.mock.calls[0];
    expect(call[1].body).toContain('text1');
    expect(call[1].body).toContain('text2');
  });

  it('throws on fetch network error', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://example.test/v1',
      apiKey: '',
      modelName: 'test-model',
      dimension: 3
    });
    await expect(provider.embed('hi')).rejects.toThrow('Network error');
  });

  it('throws on fetch timeout', async () => {
    fetch.mockImplementation(() => {
      const err = new Error('Aborted');
      err.name = 'AbortError';
      throw err;
    });
    const provider = createOpenAICompatibleProvider({
      endpoint: 'http://example.test/v1',
      apiKey: '',
      modelName: 'test-model',
      dimension: 3
    });
    await expect(provider.embed('hi')).rejects.toThrow('timeout');
  });
});
