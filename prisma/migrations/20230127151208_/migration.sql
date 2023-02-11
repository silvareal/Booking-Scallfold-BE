/*
  Warnings:

  - You are about to drop the `ScheduleRuleIntervals` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ScheduleRuleIntervals" DROP CONSTRAINT "ScheduleRuleIntervals_ruleId_fkey";

-- AlterTable
ALTER TABLE "ScheduleRule" ADD COLUMN     "intervals" JSONB[];

-- DropTable
DROP TABLE "ScheduleRuleIntervals";
