-- AlterTable
ALTER TABLE "users" ADD COLUMN "editorial_role" TEXT NOT NULL DEFAULT 'USER',
ADD COLUMN "author_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_author_id_key" ON "users"("author_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
