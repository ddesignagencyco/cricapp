ALTER TABLE "news_articles"
  ADD COLUMN "translation_group_id" TEXT,
  ADD COLUMN "push_notification_title" TEXT,
  ADD COLUMN "push_notification_body" TEXT,
  ADD COLUMN "social_copy" TEXT;

CREATE INDEX "news_articles_translation_group_id_idx"
  ON "news_articles"("translation_group_id");

CREATE UNIQUE INDEX "news_articles_translation_group_id_language_key"
  ON "news_articles"("translation_group_id", "language");

CREATE TABLE "editorial_pages" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "editorial_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "editorial_pages_slug_key"
  ON "editorial_pages"("slug");
