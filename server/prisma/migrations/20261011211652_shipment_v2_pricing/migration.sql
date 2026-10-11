-- AlterEnum
ALTER TYPE "DeliveryType" ADD VALUE 'SIMPLE';

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "deliveryDistanceKm" DECIMAL(6,2),
ADD COLUMN     "pickupRound" TEXT,
ADD COLUMN     "plannedPickupDate" TIMESTAMP(3);
