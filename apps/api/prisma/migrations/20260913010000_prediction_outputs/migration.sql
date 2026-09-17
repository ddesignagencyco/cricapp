ALTER TABLE "prediction_results"
  ADD COLUMN IF NOT EXISTS "calibration_band" TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS "top_batters" JSONB,
  ADD COLUMN IF NOT EXISTS "top_bowlers" JSONB,
  ADD COLUMN IF NOT EXISTS "momentum" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "pressure_index" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "partnership_projection" JSONB,
  ADD COLUMN IF NOT EXISTS "wicket_risk" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "prediction_results_calibration_band_idx"
  ON "prediction_results" ("calibration_band");
