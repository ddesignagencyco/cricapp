-- Separate public gallery uploads from editorial / cover assets in the same table.
ALTER TABLE "gallery_media" ADD COLUMN IF NOT EXISTS "purpose" TEXT NOT NULL DEFAULT 'gallery';

CREATE INDEX IF NOT EXISTS "gallery_media_purpose_idx" ON "gallery_media"("purpose");

-- Covers already linked on news rows were uploaded via the gallery picker.
UPDATE "gallery_media" g
SET "purpose" = 'editorial'
FROM "news_articles" a
WHERE a."image_url" = g."url" AND g."purpose" = 'gallery';
