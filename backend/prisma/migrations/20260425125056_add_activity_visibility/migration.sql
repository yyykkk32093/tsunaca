-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "visibility" TEXT;
