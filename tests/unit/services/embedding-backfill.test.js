jest.mock('@/lib/db/client', () => ({
  db: {
    questions: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/embedding/index.js', () => ({
  getEmbeddingService: jest.fn(),
}));

const { processEmbeddingBackfillTask } = require('@/lib/services/tasks/embedding-backfill');
const { db } = require('@/lib/db/client');
const { getEmbeddingService } = require('@/lib/services/embedding/index.js');

describe('embedding-backfill task', () => {
  let mockPipeline;
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockPipeline = {
      processQuestions: jest.fn().mockImplementation(async questions => questions.map(q => ({ id: q.id, ok: true }))),
    };
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('skips processing when embedding service is disabled', async () => {
    getEmbeddingService.mockResolvedValue({
      config: { enabled: false },
    });

    const task = { id: 'task-1', projectId: 'proj-1' };
    await processEmbeddingBackfillTask(task);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[embedding-backfill] skipped (disabled) task=task-1'
    );
    expect(db.questions.findMany).not.toHaveBeenCalled();
  });

  it('sends each batch to processQuestions in the mapped shape', async () => {
    getEmbeddingService.mockResolvedValue({
      config: { enabled: true },
      pipeline: mockPipeline,
    });

    const questions = [
      { id: 'q1', question: 'What is AI?', projectId: 'proj-1', chunkId: 'chunk-1' },
      { id: 'q2', question: 'What is ML?', projectId: 'proj-1', chunkId: 'chunk-2' },
    ];

    db.questions.findMany
      .mockResolvedValueOnce(questions)
      .mockResolvedValueOnce([]);

    const task = { id: 'task-1', projectId: 'proj-1' };
    await processEmbeddingBackfillTask(task);

    expect(mockPipeline.processQuestions).toHaveBeenCalledTimes(1);
    expect(mockPipeline.processQuestions).toHaveBeenCalledWith([
      { id: 'q1', text: 'What is AI?', projectId: 'proj-1', chunkId: 'chunk-1' },
      { id: 'q2', text: 'What is ML?', projectId: 'proj-1', chunkId: 'chunk-2' },
    ]);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[embedding-backfill] complete task=task-1 processed=2'
    );
  });

  it('continues to next batch when batch size reached', async () => {
    getEmbeddingService.mockResolvedValue({
      config: { enabled: true },
      pipeline: mockPipeline,
    });

    const batch1 = Array.from({ length: 100 }, (_, i) => ({
      id: `q${i}`,
      question: `Question ${i}`,
      projectId: 'proj-1',
    }));
    const batch2 = [{ id: 'q100', question: 'Final question', projectId: 'proj-1' }];

    db.questions.findMany
      .mockResolvedValueOnce(batch1)
      .mockResolvedValueOnce(batch2)
      .mockResolvedValueOnce([]);

    const task = { id: 'task-1', projectId: 'proj-1' };
    await processEmbeddingBackfillTask(task);

    expect(mockPipeline.processQuestions).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[embedding-backfill] complete task=task-1 processed=101'
    );
  });

  it('counts only ok results toward processed', async () => {
    getEmbeddingService.mockResolvedValue({
      config: { enabled: true },
      pipeline: mockPipeline,
    });

    mockPipeline.processQuestions.mockResolvedValueOnce([
      { id: 'q1', ok: true },
      { id: 'q2', ok: false },
      { id: 'q3', ok: true },
    ]);

    db.questions.findMany
      .mockResolvedValueOnce([
        { id: 'q1', question: 'Good question', projectId: 'proj-1' },
        { id: 'q2', question: 'Bad question', projectId: 'proj-1' },
        { id: 'q3', question: 'Good question 2', projectId: 'proj-1' },
      ])
      .mockResolvedValueOnce([]);

    const task = { id: 'task-1', projectId: 'proj-1' };
    await processEmbeddingBackfillTask(task);

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[embedding-backfill] complete task=task-1 processed=2'
    );
  });

  it('filters only questions without embeddedAt timestamp', async () => {
    getEmbeddingService.mockResolvedValue({
      config: { enabled: true },
      pipeline: mockPipeline,
    });

    db.questions.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    const task = { id: 'task-1', projectId: 'proj-1' };
    await processEmbeddingBackfillTask(task);

    expect(db.questions.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'proj-1', embeddedAt: null },
      })
    );
  });
});
