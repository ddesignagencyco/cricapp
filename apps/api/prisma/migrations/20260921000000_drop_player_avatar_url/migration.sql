-- Revert separate player avatar column; Sportradar image URLs live in profile_url.
ALTER TABLE "players" DROP COLUMN IF EXISTS "avatar_url";
