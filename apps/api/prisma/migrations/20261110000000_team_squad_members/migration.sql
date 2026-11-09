-- CreateTable
CREATE TABLE "team_squad_members" (
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'roster',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_squad_members_pkey" PRIMARY KEY ("team_id","player_id")
);

-- CreateIndex
CREATE INDEX "team_squad_members_player_id_idx" ON "team_squad_members"("player_id");

-- AddForeignKey
ALTER TABLE "team_squad_members" ADD CONSTRAINT "team_squad_members_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
