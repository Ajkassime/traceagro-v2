-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('pending', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'purchase_order';
ALTER TYPE "DocumentType" ADD VALUE 'tech_spec';

-- AlterTable
ALTER TABLE "conditioning_orders" ADD COLUMN     "purchase_order_id" TEXT,
ADD COLUMN     "quantity_kg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "lots" ADD COLUMN     "available_kg" DOUBLE PRECISION,
ADD COLUMN     "parent_lot_id" TEXT,
ADD COLUMN     "purchase_order_id" TEXT,
ADD COLUMN     "sub_lot_index" TEXT;

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "transport_mode" TEXT DEFAULT 'maritime';

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "quantity_kg" DOUBLE PRECISION NOT NULL,
    "destination" TEXT NOT NULL,
    "delivery_date" TIMESTAMP(3) NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'pending',
    "spec_grade" TEXT,
    "spec_humidity_min" DOUBLE PRECISION,
    "spec_humidity_max" DOUBLE PRECISION,
    "spec_length_min" DOUBLE PRECISION,
    "spec_certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "spec_packaging" TEXT,
    "spec_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_events" (
    "id" TEXT NOT NULL,
    "lot_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity_kg" DOUBLE PRECISION,
    "related_id" TEXT,
    "related_type" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lot_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "lot_events_lot_id_idx" ON "lot_events"("lot_id");

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_parent_lot_id_fkey" FOREIGN KEY ("parent_lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_events" ADD CONSTRAINT "lot_events_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditioning_orders" ADD CONSTRAINT "conditioning_orders_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
