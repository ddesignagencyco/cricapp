-- Provider ids needed for internal links: /teams/:id, /tournaments/:id.
-- team_scores carries home.id / away.id inside the existing JSONB payload.
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "tournament_id" TEXT;
