-- CreateTable
CREATE TABLE IF NOT EXISTS "rss_feed_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "category_id" TEXT,
    "author_id" TEXT,
    "include_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exclude_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rewrite_mode" TEXT NOT NULL DEFAULT 'summary_attribution',
    "auto_publish" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'en',
    "poll_interval_minutes" INTEGER NOT NULL DEFAULT 30,
    "max_items_per_poll" INTEGER NOT NULL DEFAULT 10,
    "last_synced_at" TIMESTAMP(3),
    "last_status" TEXT,
    "last_error" TEXT,
    "articles_imported" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rss_feed_sources_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "source_guid" TEXT;
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "source_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "rss_feed_sources_url_key" ON "rss_feed_sources"("url");
CREATE INDEX IF NOT EXISTS "rss_feed_sources_enabled_idx" ON "rss_feed_sources"("enabled");
CREATE UNIQUE INDEX IF NOT EXISTS "news_articles_source_guid_key" ON "news_articles"("source_guid");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "rss_feed_sources" ADD CONSTRAINT "rss_feed_sources_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "news_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "rss_feed_sources" ADD CONSTRAINT "rss_feed_sources_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
