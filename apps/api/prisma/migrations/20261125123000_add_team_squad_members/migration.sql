-- CreateTable
CREATE TABLE IF NOT EXISTS "team_squad_members" (
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'roster',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_squad_members_pkey" PRIMARY KEY ("team_id","player_id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "team_squad_members_player_id_idx" ON "team_squad_members"("player_id");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'team_squad_members_player_id_fkey'
    ) THEN
        ALTER TABLE "team_squad_members"
            ADD CONSTRAINT "team_squad_members_player_id_fkey"
            FOREIGN KEY ("player_id") REFERENCES "players"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
