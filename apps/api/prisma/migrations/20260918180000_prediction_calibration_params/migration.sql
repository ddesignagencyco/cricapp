ALTER TABLE "prediction_calibrations"
  ADD COLUMN IF NOT EXISTS "params" JSONB;
