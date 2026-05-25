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
 * @typedef {Object} Chunk
 * @property {string} id
 * @property {string} projectId
 * @property {string} text
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
 * @property {(cluster: Cluster) => Promise<void>} create
 * @property {(id: string, patch: Object) => Promise<void>} update
 * @property {(questionId: string, info: Object) => Promise<void>} attachQuestion
 */

/**
 * @typedef {Object} IChunkSource
 * @property {(projectId: string, opts?: Object) => Promise<Chunk[]>} listChunks
 * @property {(chunkId: string) => Promise<Chunk|null>} getChunk
 */

module.exports = {};  // Pure JSDoc types, no runtime exports
