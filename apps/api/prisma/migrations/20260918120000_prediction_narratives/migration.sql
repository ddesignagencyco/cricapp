CREATE TABLE IF NOT EXISTS "prediction_narratives" (
    "run_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_narratives_pkey" PRIMARY KEY ("run_id")
);

DO $$
BEGIN
    ALTER TABLE "prediction_narratives"
      ADD CONSTRAINT "prediction_narratives_run_id_fkey"
      FOREIGN KEY ("run_id") REFERENCES "prediction_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
