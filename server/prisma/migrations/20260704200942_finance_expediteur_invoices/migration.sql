-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'UNPAID';

-- DropIndex
DROP INDEX "Invoice_invoiceNumber_key";

-- DropIndex
DROP INDEX "Invoice_status_dueAt_idx";

-- AlterTable
ALTER TABLE "CodSettlement" DROP COLUMN "totalAmount",
ADD COLUMN     "commission" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "grossCod" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "netAmount" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "settledById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "dueAt",
DROP COLUMN "invoiceNumber",
DROP COLUMN "issuedAt",
DROP COLUMN "notes",
DROP COLUMN "pdfUrl",
DROP COLUMN "subtotal",
DROP COLUMN "total",
DROP COLUMN "vat",
ADD COLUMN     "amount" DECIMAL(12,3) NOT NULL,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "number" TEXT NOT NULL,
ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "paymentReference" TEXT,
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "expediteurCodSettledAt" TIMESTAMP(3),
ADD COLUMN     "invoiceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Shipment_invoiceId_idx" ON "Shipment"("invoiceId");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodSettlement" ADD CONSTRAINT "CodSettlement_settledById_fkey" FOREIGN KEY ("settledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

