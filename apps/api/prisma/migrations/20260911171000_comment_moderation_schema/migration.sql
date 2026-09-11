ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS "comments_status_idx" ON "comments" ("status");

CREATE TABLE IF NOT EXISTS "comment_reports" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "comment_id" TEXT NOT NULL,
  "reporter_id" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comment_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "comment_reports_comment_id_fkey"
    FOREIGN KEY ("comment_id") REFERENCES "comments"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "comment_reports_comment_id_idx"
  ON "comment_reports" ("comment_id");
CREATE INDEX IF NOT EXISTS "comment_reports_status_idx"
  ON "comment_reports" ("status");
