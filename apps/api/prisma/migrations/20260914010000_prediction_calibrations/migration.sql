CREATE TABLE IF NOT EXISTS "prediction_calibrations" (
  "id" TEXT NOT NULL,
  "model_version" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "slope" DOUBLE PRECISION NOT NULL,
  "intercept" DOUBLE PRECISION NOT NULL,
  "sample_size" INTEGER NOT NULL,
  "brier_score" DOUBLE PRECISION,
  "accuracy" DOUBLE PRECISION,
  "source" TEXT NOT NULL DEFAULT 'auto',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prediction_calibrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "prediction_calibrations_model_created_idx"
  ON "prediction_calibrations" ("model_version", "created_at" DESC);
