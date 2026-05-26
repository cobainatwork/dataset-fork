const { db } = require('@/lib/db/index');

const DEFAULTS = {
  id: 'default',
  endpoint: '',
  apiKey: '',
  modelName: '',
  dimension: 1024,
  hnswM: 16,
  hnswEfConstruction: 64,
  hnswEfSearch: 40,
  enabled: false,
  clusterThreshold: 0.88,
  divergenceThreshold: 0.7,
  scanAnswerDivergence: true,
  workerConcurrency: 4,
  embedBatchSize: 32
};

async function getConfig() {
  const row = await db.embeddingConfig.findUnique({ where: { id: 'default' } });
  return row || { ...DEFAULTS };
}

async function saveConfig(patch) {
  const merged = { ...DEFAULTS, ...patch, id: 'default' };
  return db.embeddingConfig.upsert({
    where: { id: 'default' },
    create: merged,
    update: patch
  });
}

module.exports = { getConfig, saveConfig, DEFAULTS };
