-- AlterTable
ALTER TABLE "jobs" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
