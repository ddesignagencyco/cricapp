-- Phase 3: team Elo ratings + situational (toss/bat-first) trends for pre-match features
CREATE TABLE IF NOT EXISTS "prediction_team_ratings" (
  "team_id" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "elo" DOUBLE PRECISION NOT NULL DEFAULT 1500,
  "played" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "prediction_team_ratings_pkey" PRIMARY KEY ("team_id", "format")
);

CREATE INDEX IF NOT EXISTS "prediction_team_ratings_format_elo_idx"
  ON "prediction_team_ratings" ("format", "elo" DESC);

CREATE TABLE IF NOT EXISTS "prediction_situation_stats" (
  "format" TEXT NOT NULL,
  "matches" INTEGER NOT NULL DEFAULT 0,
  "toss_winner_win_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "first_bat_win_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "prediction_situation_stats_pkey" PRIMARY KEY ("format")
);
