-- CreateTable prediction_runs
CREATE TABLE "prediction_runs" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "model_version" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prediction_runs_match_id_stage_created_at_idx" ON "prediction_runs"("match_id", "stage", "created_at");

-- CreateTable prediction_features
CREATE TABLE "prediction_features" (
    "run_id" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "prediction_features_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable prediction_results
CREATE TABLE "prediction_results" (
    "run_id" TEXT NOT NULL,
    "home_win_prob" DOUBLE PRECISION NOT NULL,
    "away_win_prob" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "explanation" JSONB NOT NULL,
    "score_range" JSONB,
    "xi" JSONB,

    CONSTRAINT "prediction_results_pkey" PRIMARY KEY ("run_id")
);

-- AddForeignKey
ALTER TABLE "prediction_features" ADD CONSTRAINT "prediction_features_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "prediction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction_results" ADD CONSTRAINT "prediction_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "prediction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
