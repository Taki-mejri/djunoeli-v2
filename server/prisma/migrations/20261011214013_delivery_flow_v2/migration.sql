-- AlterEnum
ALTER TYPE "ShipmentStatus" ADD VALUE 'ASSIGNED';

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "expressPickupAt" TIMESTAMP(3),
ADD COLUMN     "slaBreached" BOOLEAN,
ADD COLUMN     "slaDeadlineAt" TIMESTAMP(3);
