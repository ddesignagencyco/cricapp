-- Priority 1-4 backend: editorial depth, engagement, analytics

CREATE TABLE IF NOT EXISTS "authors" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "authors_slug_key" ON "authors"("slug");

ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "author_id" TEXT;
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "meta_title" TEXT;
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "meta_description" TEXT;
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "canonical_url" TEXT;
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "news_articles" ADD COLUMN IF NOT EXISTS "is_breaking" BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_author_id_fkey"
    FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "news_articles_language_idx" ON "news_articles"("language");
CREATE INDEX IF NOT EXISTS "news_articles_is_featured_idx" ON "news_articles"("is_featured");
CREATE INDEX IF NOT EXISTS "news_articles_is_breaking_idx" ON "news_articles"("is_breaking");

CREATE TABLE IF NOT EXISTS "news_article_players" (
    "article_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    CONSTRAINT "news_article_players_pkey" PRIMARY KEY ("article_id","player_id")
);

CREATE TABLE IF NOT EXISTS "news_article_teams" (
    "article_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    CONSTRAINT "news_article_teams_pkey" PRIMARY KEY ("article_id","team_id")
);

CREATE TABLE IF NOT EXISTS "news_article_matches" (
    "article_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    CONSTRAINT "news_article_matches_pkey" PRIMARY KEY ("article_id","match_id")
);

CREATE TABLE IF NOT EXISTS "news_article_series" (
    "article_id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    CONSTRAINT "news_article_series_pkey" PRIMARY KEY ("article_id","tournament_id")
);

DO $$ BEGIN
  ALTER TABLE "news_article_players" ADD CONSTRAINT "news_article_players_article_id_fkey"
    FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "news_article_players" ADD CONSTRAINT "news_article_players_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "news_article_teams" ADD CONSTRAINT "news_article_teams_article_id_fkey"
    FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "news_article_teams" ADD CONSTRAINT "news_article_teams_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "news_article_matches" ADD CONSTRAINT "news_article_matches_article_id_fkey"
    FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "news_article_series" ADD CONSTRAINT "news_article_series_article_id_fkey"
    FOREIGN KEY ("article_id") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "news_article_series" ADD CONSTRAINT "news_article_series_tournament_id_fkey"
    FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "share_stats" (
    "share_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "share_stats_pkey" PRIMARY KEY ("share_type","target_id")
);

CREATE TABLE IF NOT EXISTS "notification_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notification_logs_user_id_idx" ON "notification_logs"("user_id");
CREATE INDEX IF NOT EXISTS "notification_logs_created_at_idx" ON "notification_logs"("created_at");

DO $$ BEGIN
  ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
