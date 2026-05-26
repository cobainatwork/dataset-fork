-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "Datasets" ADD COLUMN     "answerEmbeddedAt" TIMESTAMP(3),
ADD COLUMN     "answerEmbeddingModel" TEXT,
ADD COLUMN     "clusterId" TEXT,
ADD COLUMN     "divergenceFlag" TEXT;

-- AlterTable
ALTER TABLE "Questions" ADD COLUMN     "clusterId" TEXT,
ADD COLUMN     "clusterRole" TEXT,
ADD COLUMN     "embeddedAt" TIMESTAMP(3),
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "similarityScore" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "EmbeddingConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "endpoint" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL DEFAULT '',
    "modelName" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL DEFAULT 1024,
    "hnswM" INTEGER NOT NULL DEFAULT 16,
    "hnswEfConstruction" INTEGER NOT NULL DEFAULT 64,
    "hnswEfSearch" INTEGER NOT NULL DEFAULT 40,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clusterThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.88,
    "divergenceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.70,
    "scanAnswerDivergence" BOOLEAN NOT NULL DEFAULT true,
    "workerConcurrency" INTEGER NOT NULL DEFAULT 4,
    "embedBatchSize" INTEGER NOT NULL DEFAULT 32,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbeddingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Embeddings" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "vector" vector(1024) NOT NULL,
    "modelName" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL DEFAULT 1024,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCluster" (
    "id" TEXT NOT NULL,
    "primaryQuestionId" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 1,
    "projectCount" INTEGER NOT NULL DEFAULT 1,
    "avgSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hasAnswerDivergence" BOOLEAN NOT NULL DEFAULT false,
    "divergenceScore" DOUBLE PRECISION,
    "embeddingModel" TEXT NOT NULL,
    "thresholdAtCreate" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterProject" (
    "clusterId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ClusterProject_pkey" PRIMARY KEY ("clusterId","projectId")
);

-- CreateTable
CREATE TABLE "ClusterFeedback" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "similarityAtTime" DOUBLE PRECISION NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClusterFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmbeddingUsageLogs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "vectorCount" INTEGER NOT NULL DEFAULT 1,
    "latency" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "errorType" TEXT,
    "projectId" TEXT,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateString" TEXT NOT NULL,

    CONSTRAINT "EmbeddingUsageLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Embeddings_sourceType_idx" ON "Embeddings"("sourceType");

-- CreateIndex
CREATE UNIQUE INDEX "Embeddings_sourceType_sourceId_key" ON "Embeddings"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "QuestionCluster_hasAnswerDivergence_idx" ON "QuestionCluster"("hasAnswerDivergence");

-- CreateIndex
CREATE INDEX "QuestionCluster_size_idx" ON "QuestionCluster"("size");

-- CreateIndex
CREATE INDEX "ClusterProject_projectId_idx" ON "ClusterProject"("projectId");

-- CreateIndex
CREATE INDEX "ClusterProject_clusterId_idx" ON "ClusterProject"("clusterId");

-- CreateIndex
CREATE INDEX "ClusterFeedback_clusterId_idx" ON "ClusterFeedback"("clusterId");

-- CreateIndex
CREATE INDEX "ClusterFeedback_verdict_similarityAtTime_idx" ON "ClusterFeedback"("verdict", "similarityAtTime");

-- CreateIndex
CREATE INDEX "EmbeddingUsageLogs_dateString_idx" ON "EmbeddingUsageLogs"("dateString");

-- CreateIndex
CREATE INDEX "EmbeddingUsageLogs_status_dateString_idx" ON "EmbeddingUsageLogs"("status", "dateString");

-- CreateIndex
CREATE INDEX "EmbeddingUsageLogs_errorType_idx" ON "EmbeddingUsageLogs"("errorType");

-- CreateIndex
CREATE INDEX "Datasets_clusterId_idx" ON "Datasets"("clusterId");

-- CreateIndex
CREATE INDEX "Datasets_divergenceFlag_idx" ON "Datasets"("divergenceFlag");

-- CreateIndex
CREATE INDEX "Questions_clusterId_idx" ON "Questions"("clusterId");

-- CreateIndex
CREATE INDEX "Questions_embeddedAt_idx" ON "Questions"("embeddedAt");

-- AddForeignKey
ALTER TABLE "ClusterProject" ADD CONSTRAINT "ClusterProject_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "QuestionCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterFeedback" ADD CONSTRAINT "ClusterFeedback_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "QuestionCluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- HNSW indexes for ANN search, partitioned by sourceType
CREATE INDEX "Embeddings_vector_question_hnsw_idx"
  ON "Embeddings" USING hnsw (vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE "sourceType" = 'question';

CREATE INDEX "Embeddings_vector_answer_hnsw_idx"
  ON "Embeddings" USING hnsw (vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64)
  WHERE "sourceType" = 'answer';

-- Partial indexes from spec §5.3
CREATE INDEX "idx_datasets_divergent"
  ON "Datasets"("projectId", "clusterId")
  WHERE "divergenceFlag" = 'divergent';

CREATE INDEX "idx_clusters_divergent"
  ON "QuestionCluster"("size")
  WHERE "hasAnswerDivergence" = true;
