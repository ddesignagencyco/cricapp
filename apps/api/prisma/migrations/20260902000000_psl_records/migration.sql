-- CreateTable psl_standings
CREATE TABLE "psl_standings" (
    "id" SERIAL NOT NULL,
    "season_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "team_name" TEXT NOT NULL,
    "team_abbr" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "tied" INTEGER NOT NULL DEFAULT 0,
    "no_result" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "net_run_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runs_for" INTEGER NOT NULL DEFAULT 0,
    "runs_against" INTEGER NOT NULL DEFAULT 0,
    "overs_for" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overs_against" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "change" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psl_standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable psl_fixtures
CREATE TABLE "psl_fixtures" (
    "match_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "status" TEXT,
    "scheduled" TEXT,
    "home_team_id" TEXT,
    "home_team_name" TEXT,
    "home_team_abbr" TEXT,
    "away_team_id" TEXT,
    "away_team_name" TEXT,
    "away_team_abbr" TEXT,
    "venue" TEXT,
    "result_text" TEXT,
    "round" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psl_fixtures_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable psl_leaders
CREATE TABLE "psl_leaders" (
    "id" SERIAL NOT NULL,
    "season_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "stat" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "player_id" TEXT NOT NULL,
    "player_name" TEXT NOT NULL,
    "team_abbr" TEXT,
    "team_name" TEXT,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "psl_leaders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "psl_standings_season_id_team_id_key" ON "psl_standings"("season_id", "team_id");

-- CreateIndex
CREATE INDEX "psl_standings_season_id_rank_idx" ON "psl_standings"("season_id", "rank");

-- CreateIndex
CREATE INDEX "psl_fixtures_season_id_idx" ON "psl_fixtures"("season_id");

-- CreateIndex
CREATE INDEX "psl_fixtures_scheduled_idx" ON "psl_fixtures"("scheduled");

-- CreateIndex
CREATE UNIQUE INDEX "psl_leaders_season_id_category_stat_player_id_key" ON "psl_leaders"("season_id", "category", "stat", "player_id");

-- CreateIndex
CREATE INDEX "psl_leaders_season_id_category_stat_rank_idx" ON "psl_leaders"("season_id", "category", "stat", "rank");
