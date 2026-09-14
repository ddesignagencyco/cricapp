-- Prisma @updatedAt does not add a SQL DEFAULT. Databases created with
-- `prisma db push` therefore reject raw INSERTs that omit updated_at.
ALTER TABLE "psl_standings"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "psl_fixtures"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "psl_leaders"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
