-- CreateTable tours
CREATE TABLE "tours" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" JSONB,
    "sport" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable tournaments
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "gender" TEXT,
    "category" JSONB,
    "current_season" JSONB,
    "sport" JSONB,
    "tour_id" TEXT,
    "parent_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable sport_event_records
CREATE TABLE "sport_event_records" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "scope_key" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "status" TEXT,
    "scheduled" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sport_event_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sport_event_records_kind_scope_key_event_id_key" ON "sport_event_records"("kind", "scope_key", "event_id");

-- CreateIndex
CREATE INDEX "sport_event_records_kind_scope_key_idx" ON "sport_event_records"("kind", "scope_key");

-- CreateTable match_timelines
CREATE TABLE "match_timelines" (
    "match_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_timelines_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable head_to_head
CREATE TABLE "head_to_head" (
    "team_a_id" TEXT NOT NULL,
    "team_b_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "head_to_head_pkey" PRIMARY KEY ("team_a_id", "team_b_id")
);

-- CreateTable team_profiles
CREATE TABLE "team_profiles" (
    "team_id" TEXT NOT NULL,
    "manager" JSONB,
    "team_info" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_profiles_pkey" PRIMARY KEY ("team_id")
);

-- CreateTable player_profiles
CREATE TABLE "player_profiles" (
    "player_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("player_id")
);

-- AlterTable teams: add enriched team profile fields
ALTER TABLE "teams" ADD COLUMN "manager" TEXT;

-- AlterTable players: add enriched player profile fields
ALTER TABLE "players" ADD COLUMN "country_code" TEXT;
ALTER TABLE "players" ADD COLUMN "jersey_number" INTEGER;
ALTER TABLE "players" ADD COLUMN "height" INTEGER;