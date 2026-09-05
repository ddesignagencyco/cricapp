-- CreateTable tournament_seasons
CREATE TABLE "tournament_seasons" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "name" TEXT,
    "year" TEXT,
    "start_date" TEXT,
    "end_date" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tournament_seasons_tournament_id_idx" ON "tournament_seasons"("tournament_id");

-- AddForeignKey
ALTER TABLE "tournament_seasons" ADD CONSTRAINT "tournament_seasons_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;