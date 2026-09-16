// lib/services/embedding/ports.js
/**
 * @typedef {Object} VectorPoint
 * @property {string} id
 * @property {number[]} vector
 * @property {Object} [payload]
 */

/**
 * @typedef {Object} Match
 * @property {string} id
 * @property {number} score   // cosine similarity (0-1)
 */

/**
 * @typedef {Object} SearchOpts
 * @property {number} [top]
 * @property {string[]} [excludeIds]
 */

/**
 * @typedef {Object} Cluster
 * @property {string} id
 * @property {string} primaryQuestionId
 * @property {number} size
 * @property {number} projectCount
 * @property {number} avgSimilarity
 * @property {boolean} hasAnswerDivergence
 * @property {number} thresholdAtCreate
 * @property {number} version
 */

/**
 * @typedef {Object} IEmbeddingProvider
 * @property {(text: string) => Promise<Float32Array>} embed
 * @property {(texts: string[]) => Promise<Float32Array[]>} embedBatch
 * @property {() => number} dimension
 * @property {() => Promise<boolean>} healthCheck
 */

/**
 * @typedef {Object} IVectorStore
 * @property {(sourceType: string, dim: number) => Promise<void>} ensureSchema
 * @property {(sourceType: string, points: VectorPoint[]) => Promise<void>} upsert
 * @property {(sourceType: string, vector: number[], opts: SearchOpts) => Promise<Match[]>} search
 * @property {(sourceType: string, ids: string[]) => Promise<void>} deletePoints
 * @property {(sourceType: string, filter: Object) => Promise<number>} count
 * @property {() => Promise<boolean>} healthCheck
 */

/**
 * @typedef {Object} IClusterRepository
 * @property {(id: string) => Promise<Cluster|null>} findById
 * @property {(cluster: Cluster) => Promise<Cluster>} create
 * @property {(id: string, patch: Object) => Promise<void>} update
 */

/**
 * @typedef {Object} QuestionInput
 * @property {string} id
 * @property {string} text
 * @property {string} projectId
 * @property {string|null} [chunkId]
 */

/**
 * @typedef {Object} QuestionMetadata
 * @property {string} id
 * @property {string|null} clusterId
 * @property {string|null} conditionFingerprint
 */

/**
 * @typedef {Object} ConfirmedDataset
 * @property {string} id
 * @property {string} answer
 * @property {string} projectId
 */

/**
 * pipeline 的資料持久化 seam：Questions 的 fingerprint / cluster link、
 * 排除集解析、divergence 寫入、usage log。vector store 只看 excludeIds，
 * 排除集（同 chunk / 同 project）由這個 seam 解析成 id 列表。
 */

/**
 * @typedef {Object} IQuestionStore
 * @property {(id: string, fingerprint: string|null) => Promise<void>} updateFingerprint
 * @property {(id: string, info: { projectId: string, clusterId: string, role: string, similarity: number, modelName: string }) => Promise<void>} linkToCluster - 同時寫 ClusterProject upsert 與 Questions 的 cluster link / embeddingModel / embeddedAt
 * @property {(ids: string[]) => Promise<QuestionMetadata[]>} findByIds
 * @property {({ chunkId?: string|null, projectId?: string|null } = {}) => Promise<string[]>} findExcludedQuestionIds
 * @property {(clusterId: string) => Promise<ConfirmedDataset[]>} findConfirmedDatasets
 * @property {(clusterId: string, info: { hasAnswerDivergence: boolean, divergenceScore: number, flag?: string }) => Promise<void>} recordDivergence
 * @property {(entry: Object) => Promise<void>} logEmbeddingUsage
 */

module.exports = {}; // Pure JSDoc types, no runtime exports
