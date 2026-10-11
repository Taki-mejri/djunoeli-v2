-- CreateTable
CREATE TABLE "LivreurCodSettlement" (
    "id" TEXT NOT NULL,
    "livreurId" TEXT NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "note" TEXT,
    "settledById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivreurCodSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LivreurCodSettlement_livreurId_createdAt_idx" ON "LivreurCodSettlement"("livreurId", "createdAt");

-- AddForeignKey
ALTER TABLE "LivreurCodSettlement" ADD CONSTRAINT "LivreurCodSettlement_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "Livreur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivreurCodSettlement" ADD CONSTRAINT "LivreurCodSettlement_settledById_fkey" FOREIGN KEY ("settledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
