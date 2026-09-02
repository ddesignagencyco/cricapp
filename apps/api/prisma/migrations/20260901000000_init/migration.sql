-- CreateSchema
-- Baseline: matches table is owned by services/ingestion (data/init.sql).
-- This migration only creates the read-layer team/player tables plus indexes
-- on the existing matches table.

-- CreateTable teams
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbr" TEXT NOT NULL,
    "country" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable players
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "short_name" TEXT,
    "team_id" TEXT,
    "birth" TEXT,
    "nationality" TEXT,
    "batting_style" TEXT,
    "bowling_style" TEXT,
    "role" TEXT,
    "profile_url" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "teams_abbr_idx" ON "teams"("abbr");

-- CreateIndex
CREATE INDEX "players_team_id_idx" ON "players"("team_id");

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Read-layer indexes on the ingestion-owned matches table (safe / idempotent).
CREATE INDEX IF NOT EXISTS "matches_status_idx" ON "matches"("status");
CREATE INDEX IF NOT EXISTS "matches_scheduled_idx" ON "matches"("scheduled");
CREATE INDEX IF NOT EXISTS "matches_tournament_idx" ON "matches"("tournament");
