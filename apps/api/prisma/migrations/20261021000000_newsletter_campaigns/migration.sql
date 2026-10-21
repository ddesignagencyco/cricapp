-- Newsletter campaigns: per-type preferences, engagement, and a send log that makes a
-- repeat delivery of the same issue to the same subscriber impossible.

ALTER TABLE "newsletter_subscribers"
  ADD COLUMN IF NOT EXISTS "preferences" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "last_engaged_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "last_sent_at" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "newsletter_sends" (
  "id" TEXT NOT NULL,
  "subscriber_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "issue_key" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'sent',
  "error" TEXT,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "newsletter_sends_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "newsletter_sends_subscriber_id_fkey" FOREIGN KEY ("subscriber_id")
    REFERENCES "newsletter_subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_sends_subscriber_id_type_issue_key_key"
  ON "newsletter_sends"("subscriber_id", "type", "issue_key");
CREATE INDEX IF NOT EXISTS "newsletter_sends_type_issue_key_idx"
  ON "newsletter_sends"("type", "issue_key");
CREATE INDEX IF NOT EXISTS "newsletter_sends_subscriber_id_sent_at_idx"
  ON "newsletter_sends"("subscriber_id", "sent_at");
