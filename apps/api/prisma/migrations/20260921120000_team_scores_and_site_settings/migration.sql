ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "team_scores" JSONB;

CREATE TABLE IF NOT EXISTS "site_settings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "email" TEXT,
  "support_email" TEXT,
  "phone" TEXT,
  "whatsapp" TEXT,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT,
  "maps_url" TEXT,
  "working_hours" TEXT,
  "socials" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);
