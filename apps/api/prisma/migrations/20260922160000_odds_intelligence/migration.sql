-- Phase 14: Odds Intelligence (licensed feeds only; snapshots are append-only)

CREATE TABLE "odds_sources" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL DEFAULT 'aggregator',
    "license_status" TEXT NOT NULL DEFAULT 'disabled',
    "external_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "odds_sources_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "odds_sources_slug_key" ON "odds_sources"("slug");

CREATE TABLE "odds_markets" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "market_type" TEXT NOT NULL,
    "market_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "external_market_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "odds_markets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "odds_markets_match_id_source_id_market_type_key" ON "odds_markets"("match_id", "source_id", "market_type");
CREATE INDEX "odds_markets_match_id_market_key_idx" ON "odds_markets"("match_id", "market_key");

CREATE TABLE "odds_snapshots" (
    "id" TEXT NOT NULL,
    "market_id" TEXT NOT NULL,
    "selection_key" TEXT NOT NULL,
    "decimal_price" DOUBLE PRECISION NOT NULL,
    "captured_at" TIMESTAMPTZ NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw" JSONB,

    CONSTRAINT "odds_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "odds_snapshots_market_id_selection_key_captured_at_idx" ON "odds_snapshots"("market_id", "selection_key", "captured_at");

ALTER TABLE "odds_markets" ADD CONSTRAINT "odds_markets_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "odds_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "odds_markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
