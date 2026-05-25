const { db } = require('@/lib/db/index');

function createDefaultChunkSource() {
  async function listChunks(projectId, _opts = {}) {
    const rows = await db.chunks.findMany({ where: { projectId } });
    return rows.map(c => ({ id: c.id, projectId: c.projectId, text: c.content }));
  }

  async function getChunk(chunkId) {
    const c = await db.chunks.findUnique({ where: { id: chunkId } });
    if (!c) return null;
    return { id: c.id, projectId: c.projectId, text: c.content };
  }

  return { listChunks, getChunk };
}

module.exports = { createDefaultChunkSource };
