CREATE TABLE IF NOT EXISTS "prediction_performance_snapshots" (
  "id" TEXT NOT NULL,
  "model_version" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "sample_size" INTEGER NOT NULL,
  "accuracy" DOUBLE PRECISION,
  "brier_score" DOUBLE PRECISION,
  "expected_calibration_error" DOUBLE PRECISION,
  "by_format" JSONB NOT NULL,
  "by_confidence" JSONB NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'auto',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prediction_performance_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "prediction_performance_snapshots_model_stage_created_idx"
  ON "prediction_performance_snapshots" ("model_version", "stage", "created_at" DESC);