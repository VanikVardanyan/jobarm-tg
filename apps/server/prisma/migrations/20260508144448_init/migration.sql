-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('new', 'in_progress', 'pending_confirmation', 'completed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegram_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "language" TEXT NOT NULL DEFAULT 'ru',
    "is_master" BOOLEAN NOT NULL DEFAULT false,
    "is_customer" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "chat_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name_ru" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_categories" (
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,

    CONSTRAINT "user_categories_pkey" PRIMARY KEY ("user_id","category_id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" INTEGER NOT NULL,
    "date_from" DATE NOT NULL,
    "date_to" DATE NOT NULL,
    "selected_master_id" TEXT,
    "master_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "customer_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "job_status" NOT NULL DEFAULT 'new',

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "master_id" TEXT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "master_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_en_key" ON "categories"("name_en");

-- CreateIndex
CREATE INDEX "jobs_category_id_status_idx" ON "jobs"("category_id", "status");

-- CreateIndex
CREATE INDEX "jobs_customer_id_idx" ON "jobs"("customer_id");

-- CreateIndex
CREATE INDEX "applications_master_id_idx" ON "applications"("master_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_job_id_master_id_key" ON "applications"("job_id", "master_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_job_id_key" ON "reviews"("job_id");

-- CreateIndex
CREATE INDEX "reviews_master_id_idx" ON "reviews"("master_id");

-- CreateIndex
CREATE INDEX "reviews_customer_id_idx" ON "reviews"("customer_id");

-- AddForeignKey
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_categories" ADD CONSTRAINT "user_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_selected_master_id_fkey" FOREIGN KEY ("selected_master_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
