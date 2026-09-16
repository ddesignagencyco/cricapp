ALTER TABLE "newsletter_subscribers"
  ADD COLUMN "user_id" TEXT;

UPDATE "newsletter_subscribers" AS subscriber
SET "user_id" = (
  SELECT "id"
  FROM "users"
  WHERE LOWER("users"."email") = LOWER(subscriber."email")
  ORDER BY "users"."created_at" ASC
  LIMIT 1
);

CREATE UNIQUE INDEX "newsletter_subscribers_user_id_key"
  ON "newsletter_subscribers"("user_id");

ALTER TABLE "newsletter_subscribers"
  ADD CONSTRAINT "newsletter_subscribers_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
