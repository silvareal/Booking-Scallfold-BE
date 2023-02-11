/*
  Warnings:

  - The `intervals` column on the `ScheduleRule` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ScheduleRule" DROP COLUMN "intervals",
ADD COLUMN     "intervals" JSONB;
