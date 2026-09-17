const { db } = require('@/lib/db/client');
const { getConfig } = require('./config');
const { createOpenAICompatibleProvider } = require('./adapters/openai-compatible');
const { createPgvectorStore } = require('./adapters/pgvector');
const { createPrismaClusterRepository } = require('./adapters/prisma-cluster');
const { createPrismaQuestionStore } = require('./adapters/prisma-question-store');
const { createPipeline } = require('./pipeline');
const { createClusterManager } = require('./cluster-manager');

let _instance;
let _clusterManager;

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

// ClusterManager 只依賴 clusterRepo / questionStore / vectorStore（皆由 db 建），
// 與 pipeline 分離：刪除/收斂路徑不需拉起 OpenAI provider 或 config。
function getClusterManager() {
  if (_clusterManager) return _clusterManager;
  _clusterManager = createClusterManager({
    clusterRepo: createPrismaClusterRepository(db),
    questionStore: createPrismaQuestionStore(db),
    vectorStore: createPgvectorStore(db),
  });
  return _clusterManager;
}

function resetEmbeddingService() {
  _instance = null;
  _clusterManager = null;
}

module.exports = { getEmbeddingService, resetEmbeddingService };
