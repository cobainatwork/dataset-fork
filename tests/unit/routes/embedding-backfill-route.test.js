jest.mock('@/lib/db/index', () => ({
  db: {
    task: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const { POST } = require('@/app/api/embedding/backfill/route');
const { db } = require('@/lib/db/index');

describe('/api/embedding/backfill route', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns 400 error when projectId is missing', async () => {
    const request = {
      json: async () => ({}),
    };

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('PROJECT_ID_REQUIRED');
  });

  it('returns 400 error when body cannot be parsed', async () => {
    const request = {
      json: async () => {
        throw new Error('Invalid JSON');
      },
    };

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('PROJECT_ID_REQUIRED');
  });

  it('returns 409 when backfill is already running for project', async () => {
    const existingTask = { id: 'task-existing', taskType: 'embedding-backfill' };
    db.task.findFirst.mockResolvedValue(existingTask);

    const request = {
      json: async () => ({ projectId: 'proj-1' }),
    };

    const response = await POST(request);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('BACKFILL_ALREADY_RUNNING');
    expect(body.taskId).toBe('task-existing');
  });

  it('creates new backfill task when none running', async () => {
    db.task.findFirst.mockResolvedValue(null);
    const newTask = { id: 'task-new', projectId: 'proj-1', taskType: 'embedding-backfill' };
    db.task.create.mockResolvedValue(newTask);

    const request = {
      json: async () => ({ projectId: 'proj-1' }),
    };

    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.taskId).toBe('task-new');
  });

  it('creates task with correct properties', async () => {
    db.task.findFirst.mockResolvedValue(null);
    const newTask = { id: 'task-new', projectId: 'proj-1', taskType: 'embedding-backfill' };
    db.task.create.mockResolvedValue(newTask);

    const request = {
      json: async () => ({ projectId: 'proj-1' }),
    };

    await POST(request);

    expect(db.task.create).toHaveBeenCalledWith({
      data: {
        taskType: 'embedding-backfill',
        projectId: 'proj-1',
        detail: '{}',
        modelInfo: '{}',
        status: 0,
      },
    });
  });

  it('filters for only non-completed backfill tasks', async () => {
    db.task.findFirst.mockResolvedValue(null);
    db.task.create.mockResolvedValue({ id: 'task-new' });

    const request = {
      json: async () => ({ projectId: 'proj-1' }),
    };

    await POST(request);

    expect(db.task.findFirst).toHaveBeenCalledWith({
      where: {
        taskType: 'embedding-backfill',
        projectId: 'proj-1',
        status: { in: [0] },
      },
    });
  });
});
