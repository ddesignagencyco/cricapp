-- One-time codes for apps: every reset/verification email carries a link and a
-- 6-digit code. Only the bcrypt hash of the code is stored, and wrong guesses are
-- counted so a code dies after a handful of attempts. Existing rows keep working
-- through their link (no code).
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "code_hash" TEXT;
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "code_attempts" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "email_verification_tokens" ADD COLUMN IF NOT EXISTS "code_hash" TEXT;
ALTER TABLE "email_verification_tokens" ADD COLUMN IF NOT EXISTS "code_attempts" INTEGER NOT NULL DEFAULT 0;
