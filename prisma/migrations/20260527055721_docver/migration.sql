-- AlterTable
ALTER TABLE "UploadFiles" ADD COLUMN     "lineageId" TEXT;

-- CreateTable
CREATE TABLE "DocumentReplacement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lineageId" TEXT NOT NULL,
    "oldFileId" TEXT NOT NULL,
    "oldFileName" TEXT NOT NULL,
    "newFileId" TEXT NOT NULL,
    "newFileName" TEXT NOT NULL,
    "replacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentReplacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentReplacement_projectId_idx" ON "DocumentReplacement"("projectId");

-- CreateIndex
CREATE INDEX "DocumentReplacement_lineageId_idx" ON "DocumentReplacement"("lineageId");

-- CreateIndex
CREATE INDEX "UploadFiles_lineageId_idx" ON "UploadFiles"("lineageId");

-- Backfill: existing files become their own lineage root
UPDATE "UploadFiles" SET "lineageId" = "id" WHERE "lineageId" IS NULL;
