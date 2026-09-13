DROP INDEX IF EXISTS "news_articles_is_featured_idx";
DROP INDEX IF EXISTS "news_articles_is_breaking_idx";

ALTER TABLE "news_articles"
  DROP COLUMN IF EXISTS "tags",
  DROP COLUMN IF EXISTS "is_featured",
  DROP COLUMN IF EXISTS "is_breaking";
