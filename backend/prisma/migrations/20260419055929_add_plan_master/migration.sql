-- CreateTable
CREATE TABLE "PlanMaster" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" INTEGER,
    "oneTimePrice" INTEGER,
    "revenuecatProductId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanMaster_pkey" PRIMARY KEY ("id")
);
