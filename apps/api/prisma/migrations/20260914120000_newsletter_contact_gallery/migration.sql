CREATE TABLE "newsletter_subscribers" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "unsubscribe_token" TEXT NOT NULL,
  "subscribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "newsletter_subscribers_email_key"
  ON "newsletter_subscribers"("email");
CREATE UNIQUE INDEX "newsletter_subscribers_unsubscribe_token_key"
  ON "newsletter_subscribers"("unsubscribe_token");
CREATE INDEX "newsletter_subscribers_status_idx"
  ON "newsletter_subscribers"("status");

CREATE TABLE "contact_submissions" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'new',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "contact_submissions_status_idx"
  ON "contact_submissions"("status");
CREATE INDEX "contact_submissions_created_at_idx"
  ON "contact_submissions"("created_at");

CREATE TABLE "gallery_media" (
  "id" TEXT NOT NULL,
  "title" TEXT,
  "caption" TEXT,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "public_id" TEXT NOT NULL,
  "resource_type" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "duration" DOUBLE PRECISION,
  "width" INTEGER,
  "height" INTEGER,
  "format" TEXT,
  "bytes" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gallery_media_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "gallery_media_public_id_key"
  ON "gallery_media"("public_id");
CREATE INDEX "gallery_media_type_idx" ON "gallery_media"("type");
CREATE INDEX "gallery_media_created_at_idx" ON "gallery_media"("created_at");
