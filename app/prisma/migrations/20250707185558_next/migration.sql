/*
  Warnings:

  - You are about to drop the column `forca_wins` on the `Stats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Group" ADD COLUMN     "hangman_best" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hangman_games" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hangman_losses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hangman_strek" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hangman_winrate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "hangman_wins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_best" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_draws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_games" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_losses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_winrate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "ttt_wins" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Stats" DROP COLUMN "forca_wins",
ADD COLUMN     "hangman_best" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hangman_games" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hangman_losses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hangman_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hangman_winrate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "hangman_wins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_best" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_draws" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_games" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_losses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_streak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ttt_winrate" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blacklisted_reason" TEXT DEFAULT 'None',
ADD COLUMN     "blacklisted_until" TIMESTAMP(3),
ALTER COLUMN "authorized" DROP NOT NULL,
ALTER COLUMN "blacklisted" DROP NOT NULL,
ALTER COLUMN "premium" DROP NOT NULL,
ALTER COLUMN "role" DROP NOT NULL,
ALTER COLUMN "authorized_by" DROP NOT NULL;
