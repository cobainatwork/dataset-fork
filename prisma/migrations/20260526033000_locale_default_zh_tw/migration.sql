-- AlterTable: switch default locale from zh-CN to zh-TW.
-- Existing rows keep their original value (no UPDATE) — only future
-- inserts that omit the column are affected.
ALTER TABLE "Task" ALTER COLUMN "language" SET DEFAULT 'zh-TW';
