CREATE TABLE IF NOT EXISTS "prediction_model_weights" (
  "id" TEXT NOT NULL,
  "model_version" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "weights" JSONB NOT NULL,
  "intercept" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sample_size" INTEGER NOT NULL,
  "brier_score" DOUBLE PRECISION,
  "accuracy" DOUBLE PRECISION,
  "source" TEXT NOT NULL DEFAULT 'auto',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prediction_model_weights_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "prediction_model_weights_model_stage_format_created_idx"
  ON "prediction_model_weights" ("model_version", "stage", "format", "created_at" DESC);