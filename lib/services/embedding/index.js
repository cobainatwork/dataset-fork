const { db } = require('@/lib/db/index');
const { getConfig } = require('./config');
const { createOpenAICompatibleProvider } = require('./adapters/openai-compatible');
const { createPgvectorStore } = require('./adapters/pgvector');
const { createPrismaClusterRepository } = require('./adapters/prisma-cluster');
const { createDefaultChunkSource } = require('./adapters/default-chunk-source');
const { createPipeline } = require('./pipeline');

let _instance;

async function getEmbeddingService() {
  if (_instance) return _instance;
  const config = await getConfig();
  const embedding = createOpenAICompatibleProvider(config);
  const vectorStore = createPgvectorStore(db);
  const clusterRepo = createPrismaClusterRepository(db);
  const chunkSource = createDefaultChunkSource();
  const pipeline = createPipeline({ embedding, vectorStore, clusterRepo, config, db });
  _instance = { embedding, vectorStore, clusterRepo, chunkSource, pipeline, config };
  return _instance;
}

function resetEmbeddingService() {
  _instance = null;
}

module.exports = { getEmbeddingService, resetEmbeddingService };
