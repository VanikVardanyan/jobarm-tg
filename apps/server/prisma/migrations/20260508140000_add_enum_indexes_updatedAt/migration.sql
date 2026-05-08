-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('new', 'in_progress', 'pending_confirmation', 'completed');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
DROP COLUMN "status",
ADD COLUMN     "status" "job_status" NOT NULL DEFAULT 'new';

-- CreateIndex
CREATE INDEX "applications_master_id_idx" ON "applications"("master_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_en_key" ON "categories"("name_en");

-- CreateIndex
CREATE INDEX "jobs_category_id_status_idx" ON "jobs"("category_id", "status");

-- CreateIndex
CREATE INDEX "jobs_customer_id_idx" ON "jobs"("customer_id");

-- CreateIndex
CREATE INDEX "reviews_master_id_idx" ON "reviews"("master_id");

-- CreateIndex
CREATE INDEX "reviews_customer_id_idx" ON "reviews"("customer_id");
