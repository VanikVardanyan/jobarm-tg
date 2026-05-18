-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CLIENT', 'SERVICE');

-- CreateEnum
CREATE TYPE "service_type" AS ENUM ('BODY_PAINT', 'ENGINE_CHASSIS', 'MAINTENANCE', 'TIRES', 'ELECTRICAL', 'AC', 'GLASS', 'INTERIOR', 'OTHER');

-- CreateEnum
CREATE TYPE "urgency" AS ENUM ('URGENT', 'THIS_WEEK', 'NORMAL');

-- CreateEnum
CREATE TYPE "request_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "telegram_id" TEXT NOT NULL,
    "username" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone_number" TEXT,
    "role" "user_role",
    "language" TEXT NOT NULL DEFAULT 'ru',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "chat_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "specializations" TEXT[],
    "working_hours" JSONB,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "photos" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cars" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "body_type" TEXT,
    "color" TEXT,
    "license_plate" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "car_id" TEXT NOT NULL,
    "service_type" "service_type" NOT NULL,
    "description" TEXT NOT NULL,
    "voice_file_id" TEXT,
    "photos" TEXT[],
    "district" TEXT NOT NULL,
    "urgency" "urgency" NOT NULL DEFAULT 'NORMAL',
    "is_drivable" BOOLEAN NOT NULL DEFAULT true,
    "status" "request_status" NOT NULL DEFAULT 'OPEN',
    "selected_offer_id" TEXT,
    "reminder_sent_at" TIMESTAMP(3),
    "selected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "price_max" INTEGER,
    "comment" TEXT,
    "duration" TEXT,
    "example_photos" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "photos" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_profiles_user_id_key" ON "service_profiles"("user_id");

-- CreateIndex
CREATE INDEX "service_profiles_district_is_verified_is_active_idx" ON "service_profiles"("district", "is_verified", "is_active");

-- CreateIndex
CREATE INDEX "cars_user_id_idx" ON "cars"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "requests_selected_offer_id_key" ON "requests"("selected_offer_id");

-- CreateIndex
CREATE INDEX "requests_district_status_idx" ON "requests"("district", "status");

-- CreateIndex
CREATE INDEX "requests_client_id_idx" ON "requests"("client_id");

-- CreateIndex
CREATE INDEX "requests_car_id_idx" ON "requests"("car_id");

-- CreateIndex
CREATE INDEX "offers_service_id_idx" ON "offers"("service_id");

-- CreateIndex
CREATE UNIQUE INDEX "offers_request_id_service_id_key" ON "offers"("request_id", "service_id");

-- CreateIndex
CREATE INDEX "reviews_service_id_idx" ON "reviews"("service_id");

-- CreateIndex
CREATE INDEX "reviews_author_id_idx" ON "reviews"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_request_id_author_id_key" ON "reviews"("request_id", "author_id");

-- AddForeignKey
ALTER TABLE "service_profiles" ADD CONSTRAINT "service_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_car_id_fkey" FOREIGN KEY ("car_id") REFERENCES "cars"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_selected_offer_id_fkey" FOREIGN KEY ("selected_offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
