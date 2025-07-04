-- CreateEnum
CREATE TYPE "Status" AS ENUM ('MARRIED', 'PENDING', 'SINGLE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "Ratio" AS ENUM ('RATIO_16_9', 'RATIO_1_1');

-- CreateTable
CREATE TABLE "User" (
    "database_id" SERIAL NOT NULL,
    "id" TEXT NOT NULL,
    "pix_id" TEXT NOT NULL,
    "name" TEXT DEFAULT 'Unknown',
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "premium" BOOLEAN NOT NULL DEFAULT false,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "authorized_by" TEXT NOT NULL DEFAULT 'Unknown',
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,
    "config_id" TEXT NOT NULL,
    "stats_id" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("database_id")
);

-- CreateTable
CREATE TABLE "Stats" (
    "stats_id" TEXT NOT NULL,
    "forca_wins" INTEGER NOT NULL DEFAULT 0,
    "ttt_wins" INTEGER NOT NULL DEFAULT 0,
    "stickers" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Stats_pkey" PRIMARY KEY ("stats_id")
);

-- CreateTable
CREATE TABLE "Config" (
    "config_id" TEXT NOT NULL,
    "user_ratio" "Ratio" NOT NULL DEFAULT 'RATIO_1_1',
    "auto_sticker" BOOLEAN NOT NULL DEFAULT false,
    "commands_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" SERIAL NOT NULL,
    "sender_id" INTEGER,
    "receiver_id" INTEGER,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "Marriage" (
    "marriage_id" SERIAL NOT NULL,
    "partner1ID" TEXT NOT NULL,
    "partner2ID" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'SINGLE',
    "since"     TIMESTAMP(3),
    "divorceRequested" BOOLEAN DEFAULT false,
    "divorceRequesterID" INTEGER,

    CONSTRAINT "Marriage_pkey" PRIMARY KEY ("marriage_id")
);

-- CreateTable
CREATE TABLE "Group" (
    "database_id" SERIAL NOT NULL,
    "group_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Unknown',
    "autosticker" BOOLEAN NOT NULL DEFAULT false,
    "prefix" TEXT NOT NULL DEFAULT '-',
    "members" INTEGER NOT NULL DEFAULT 0,
    "welcome_message" TEXT NOT NULL DEFAULT 'Boas-vindas {user}!',
    "total_messages" INTEGER NOT NULL DEFAULT 0,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("database_id")
);

-- CreateTable
CREATE TABLE "GroupUser" (
    "user_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GroupUser_pkey" PRIMARY KEY ("user_id","group_id")
);

-- CreateTable
CREATE TABLE "ScheduledPix" (
    "pix_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "senderID" INTEGER,
    "receiverID" INTEGER,
    "schedule_time" TIMESTAMP(3)
);

-- CreateTable
CREATE TABLE "_GroupToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_GroupToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_database_id_key" ON "User"("database_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_pix_id_key" ON "User"("pix_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_config_id_key" ON "User"("config_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_stats_id_key" ON "User"("stats_id");

-- CreateIndex
CREATE UNIQUE INDEX "Marriage_marriage_id_key" ON "Marriage"("marriage_id");

-- CreateIndex
CREATE UNIQUE INDEX "Marriage_partner1ID_key" ON "Marriage"("partner1ID");

-- CreateIndex
CREATE UNIQUE INDEX "Marriage_partner2ID_key" ON "Marriage"("partner2ID");

-- CreateIndex
CREATE UNIQUE INDEX "Marriage_divorceRequesterID_key" ON "Marriage"("divorceRequesterID");

-- CreateIndex
CREATE UNIQUE INDEX "Group_database_id_key" ON "Group"("database_id");

-- CreateIndex
CREATE UNIQUE INDEX "Group_group_id_key" ON "Group"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledPix_pix_id_key" ON "ScheduledPix"("pix_id");

-- CreateIndex
CREATE INDEX "_GroupToUser_B_index" ON "_GroupToUser"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "Config"("config_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stats_id_fkey" FOREIGN KEY ("stats_id") REFERENCES "Stats"("stats_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("database_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("database_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marriage" ADD CONSTRAINT "Marriage_divorceRequesterID_fkey" FOREIGN KEY ("divorceRequesterID") REFERENCES "User"("database_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marriage" ADD CONSTRAINT "Marriage_partner1ID_fkey" FOREIGN KEY ("partner1ID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Marriage" ADD CONSTRAINT "Marriage_partner2ID_fkey" FOREIGN KEY ("partner2ID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupUser" ADD CONSTRAINT "GroupUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("database_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupUser" ADD CONSTRAINT "GroupUser_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "Group"("database_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPix" ADD CONSTRAINT "ScheduledPix_senderID_fkey" FOREIGN KEY ("senderID") REFERENCES "User"("database_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPix" ADD CONSTRAINT "ScheduledPix_receiverID_fkey" FOREIGN KEY ("receiverID") REFERENCES "User"("database_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupToUser" ADD CONSTRAINT "_GroupToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Group"("database_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GroupToUser" ADD CONSTRAINT "_GroupToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("database_id") ON DELETE CASCADE ON UPDATE CASCADE;
