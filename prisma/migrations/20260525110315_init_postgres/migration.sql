-- CreateTable
CREATE TABLE "Projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "globalPrompt" TEXT NOT NULL DEFAULT '',
    "questionPrompt" TEXT NOT NULL DEFAULT '',
    "answerPrompt" TEXT NOT NULL DEFAULT '',
    "labelPrompt" TEXT NOT NULL DEFAULT '',
    "domainTreePrompt" TEXT NOT NULL DEFAULT '',
    "cleanPrompt" TEXT NOT NULL DEFAULT '',
    "defaultModelConfigId" TEXT,
    "test" TEXT NOT NULL DEFAULT '',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadFiles" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileExt" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "md5" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadFiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tags" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "gaPairId" TEXT,
    "question" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "imageId" TEXT,
    "imageName" TEXT,
    "templateId" TEXT,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Datasets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "answerType" TEXT DEFAULT 'text',
    "chunkName" TEXT NOT NULL,
    "chunkContent" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "questionLabel" TEXT NOT NULL,
    "cot" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiEvaluation" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "other" TEXT NOT NULL DEFAULT '',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetConversations" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "questionLabel" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiEvaluation" TEXT NOT NULL DEFAULT '',
    "tags" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "scenario" TEXT NOT NULL,
    "roleA" TEXT NOT NULL,
    "roleB" TEXT NOT NULL,
    "turnCount" INTEGER NOT NULL,
    "maxTurns" INTEGER NOT NULL,
    "rawMessages" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DatasetConversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmProviders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmProviders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmModels" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmModels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "maxTokens" INTEGER NOT NULL,
    "topP" DOUBLE PRECISION NOT NULL,
    "topK" DOUBLE PRECISION NOT NULL,
    "status" INTEGER NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "modelInfo" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh-CN',
    "detail" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomPrompts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "promptType" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPrompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GaPairs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "pairNumber" INTEGER NOT NULL,
    "genreTitle" TEXT NOT NULL,
    "genreDesc" TEXT NOT NULL,
    "audienceTitle" TEXT NOT NULL,
    "audienceDesc" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GaPairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Images" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "imageName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageDatasets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "imageName" TEXT NOT NULL,
    "questionId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "answerType" TEXT NOT NULL DEFAULT 'text',
    "model" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tags" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImageDatasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionTemplates" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "answerType" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "labels" TEXT NOT NULL DEFAULT '',
    "customFormat" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmUsageLogs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "latency" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateString" TEXT NOT NULL,

    CONSTRAINT "LlmUsageLogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalDatasets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "chunkId" TEXT,
    "options" TEXT NOT NULL DEFAULT '',
    "correctAnswer" TEXT NOT NULL,
    "tags" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvalDatasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvalResults" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "evalDatasetId" TEXT NOT NULL,
    "modelAnswer" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "judgeResponse" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvalResults_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Chunks_projectId_idx" ON "Chunks"("projectId");

-- CreateIndex
CREATE INDEX "Tags_projectId_label_idx" ON "Tags"("projectId", "label");

-- CreateIndex
CREATE INDEX "Tags_projectId_parentId_idx" ON "Tags"("projectId", "parentId");

-- CreateIndex
CREATE INDEX "Questions_projectId_idx" ON "Questions"("projectId");

-- CreateIndex
CREATE INDEX "Questions_imageId_idx" ON "Questions"("imageId");

-- CreateIndex
CREATE INDEX "Questions_templateId_idx" ON "Questions"("templateId");

-- CreateIndex
CREATE INDEX "Questions_projectId_label_idx" ON "Questions"("projectId", "label");

-- CreateIndex
CREATE INDEX "Datasets_projectId_idx" ON "Datasets"("projectId");

-- CreateIndex
CREATE INDEX "idx_export_confirmed" ON "Datasets"("projectId", "confirmed", "createAt", "id");

-- CreateIndex
CREATE INDEX "idx_project_createAt" ON "Datasets"("projectId", "createAt");

-- CreateIndex
CREATE INDEX "DatasetConversations_projectId_idx" ON "DatasetConversations"("projectId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "CustomPrompts_projectId_promptType_idx" ON "CustomPrompts"("projectId", "promptType");

-- CreateIndex
CREATE INDEX "CustomPrompts_projectId_language_idx" ON "CustomPrompts"("projectId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "CustomPrompts_projectId_promptType_promptKey_language_key" ON "CustomPrompts"("projectId", "promptType", "promptKey", "language");

-- CreateIndex
CREATE INDEX "GaPairs_projectId_idx" ON "GaPairs"("projectId");

-- CreateIndex
CREATE INDEX "GaPairs_fileId_idx" ON "GaPairs"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "GaPairs_fileId_pairNumber_key" ON "GaPairs"("fileId", "pairNumber");

-- CreateIndex
CREATE INDEX "Images_projectId_idx" ON "Images"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Images_projectId_imageName_key" ON "Images"("projectId", "imageName");

-- CreateIndex
CREATE INDEX "ImageDatasets_projectId_idx" ON "ImageDatasets"("projectId");

-- CreateIndex
CREATE INDEX "ImageDatasets_imageId_idx" ON "ImageDatasets"("imageId");

-- CreateIndex
CREATE INDEX "ImageDatasets_questionId_idx" ON "ImageDatasets"("questionId");

-- CreateIndex
CREATE INDEX "QuestionTemplates_projectId_idx" ON "QuestionTemplates"("projectId");

-- CreateIndex
CREATE INDEX "QuestionTemplates_projectId_sourceType_idx" ON "QuestionTemplates"("projectId", "sourceType");

-- CreateIndex
CREATE INDEX "LlmUsageLogs_projectId_dateString_idx" ON "LlmUsageLogs"("projectId", "dateString");

-- CreateIndex
CREATE INDEX "LlmUsageLogs_dateString_idx" ON "LlmUsageLogs"("dateString");

-- CreateIndex
CREATE INDEX "LlmUsageLogs_provider_idx" ON "LlmUsageLogs"("provider");

-- CreateIndex
CREATE INDEX "LlmUsageLogs_model_idx" ON "LlmUsageLogs"("model");

-- CreateIndex
CREATE INDEX "EvalDatasets_projectId_idx" ON "EvalDatasets"("projectId");

-- CreateIndex
CREATE INDEX "EvalDatasets_projectId_questionType_idx" ON "EvalDatasets"("projectId", "questionType");

-- CreateIndex
CREATE INDEX "EvalDatasets_chunkId_idx" ON "EvalDatasets"("chunkId");

-- CreateIndex
CREATE INDEX "EvalResults_projectId_idx" ON "EvalResults"("projectId");

-- CreateIndex
CREATE INDEX "EvalResults_taskId_idx" ON "EvalResults"("taskId");

-- CreateIndex
CREATE INDEX "EvalResults_evalDatasetId_idx" ON "EvalResults"("evalDatasetId");

-- CreateIndex
CREATE UNIQUE INDEX "EvalResults_taskId_evalDatasetId_key" ON "EvalResults"("taskId", "evalDatasetId");

-- AddForeignKey
ALTER TABLE "UploadFiles" ADD CONSTRAINT "UploadFiles_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunks" ADD CONSTRAINT "Chunks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tags" ADD CONSTRAINT "Tags_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tags" ADD CONSTRAINT "Tags_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Tags"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "Chunks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Questions" ADD CONSTRAINT "Questions_gaPairId_fkey" FOREIGN KEY ("gaPairId") REFERENCES "GaPairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Datasets" ADD CONSTRAINT "Datasets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetConversations" ADD CONSTRAINT "DatasetConversations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmModels" ADD CONSTRAINT "LlmModels_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "LlmProviders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelConfig" ADD CONSTRAINT "ModelConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPrompts" ADD CONSTRAINT "CustomPrompts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GaPairs" ADD CONSTRAINT "GaPairs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GaPairs" ADD CONSTRAINT "GaPairs_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "UploadFiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Images" ADD CONSTRAINT "Images_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageDatasets" ADD CONSTRAINT "ImageDatasets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageDatasets" ADD CONSTRAINT "ImageDatasets_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionTemplates" ADD CONSTRAINT "QuestionTemplates_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvalDatasets" ADD CONSTRAINT "EvalDatasets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvalDatasets" ADD CONSTRAINT "EvalDatasets_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "Chunks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvalResults" ADD CONSTRAINT "EvalResults_evalDatasetId_fkey" FOREIGN KEY ("evalDatasetId") REFERENCES "EvalDatasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
