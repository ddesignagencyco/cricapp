-- CreateSchema
-- The matches table is normally created by services/ingestion (data/init.sql)
-- via the postgres docker entrypoint on a fresh volume. To make this migration
-- replayable (incl. the prisma shadow database used by `prisma migrate dev`)
-- we create it here idempotently. This is a no-op when init.sql already ran.
CREATE TABLE IF NOT EXISTS "matches" (
    "match_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "teams" JSONB NOT NULL,
    "team_names" JSONB NOT NULL,
    "tournament" TEXT,
    "venue" TEXT,
    "scheduled" TEXT,
    "current_innings" JSONB,
    "last_event" JSONB NOT NULL,
    "display_score" TEXT,
    "match_status" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("match_id")
);

-- Read-layer tables plus indexes on the (now guaranteed to exist) matches table.

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
