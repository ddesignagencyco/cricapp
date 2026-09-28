-- Cached raw payload for the Sportradar GET /tournaments/{tournament_or_season_id}/info.{format}
-- endpoint (rewritten to use our tournament/season ids). The full JSON response is stored
-- so the API can re-serve it without a live fetch. Written by the ingestion service
-- (store.js saveTournamentInfo) via an upsert.
-- CreateTable
CREATE TABLE "tournament_info" (
    "tournament_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_info_pkey" PRIMARY KEY ("tournament_id")
);