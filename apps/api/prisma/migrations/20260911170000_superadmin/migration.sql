ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- Preserve an existing installation's first admin as its protected owner.
UPDATE "users"
SET "is_super_admin" = true,
    "is_admin" = true
WHERE "id" = (
  SELECT "id"
  FROM "users"
  WHERE "is_admin" = true
  ORDER BY "created_at" ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM "users" WHERE "is_super_admin" = true
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_single_super_admin"
  ON "users" ("is_super_admin")
  WHERE "is_super_admin" = true;

DO $$ BEGIN
  ALTER TABLE "users"
    ADD CONSTRAINT "users_super_admin_is_admin_check"
    CHECK (NOT "is_super_admin" OR "is_admin");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
