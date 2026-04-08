-- AlterTable
ALTER TABLE "conditioning_steps" ADD COLUMN     "bundle_count" INTEGER,
ADD COLUMN     "bundle_type" TEXT,
ADD COLUMN     "classification" TEXT,
ADD COLUMN     "is_fendue" BOOLEAN,
ADD COLUMN     "temperature" DOUBLE PRECISION,
ADD COLUMN     "vanilline_rate" DOUBLE PRECISION;
