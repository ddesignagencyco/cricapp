ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "winner_id" TEXT;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "toss_won_by" TEXT;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "toss_decision" TEXT;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "current_inning" INTEGER;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "period_scores" JSONB;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "display_overs" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "matches_winner_id_idx" ON "matches"("winner_id");
