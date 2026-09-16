const { db } = require('@/lib/db/client');
const { getConfig } = require('./config');
const { createOpenAICompatibleProvider } = require('./adapters/openai-compatible');
const { createPgvectorStore } = require('./adapters/pgvector');
const { createPrismaClusterRepository } = require('./adapters/prisma-cluster');
const { createPrismaQuestionStore } = require('./adapters/prisma-question-store');
const { createPipeline } = require('./pipeline');

let _instance;

async function getEmbeddingService() {
  if (_instance) return _instance;
  const config = await getConfig();
  const embedding = createOpenAICompatibleProvider(config);
  const vectorStore = createPgvectorStore(db);
  const clusterRepo = createPrismaClusterRepository(db);
  const questionStore = createPrismaQuestionStore(db);
  const pipeline = createPipeline({ embedding, vectorStore, clusterRepo, questionStore, config });
  _instance = { embedding, vectorStore, clusterRepo, questionStore, pipeline, config };
  return _instance;
}

function resetEmbeddingService() {
  _instance = null;
}

module.exports = { getEmbeddingService, resetEmbeddingService };
