-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DISPATCHER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "code" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'TN',
ADD COLUMN     "governorate" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
