-- CreateEnum
CREATE TYPE "RouteDifficulty" AS ENUM ('EASY', 'MODERATE', 'HARD');

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isCaminoStage" BOOLEAN NOT NULL DEFAULT false,
    "distanceKm" DECIMAL(5,1) NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "elevationGainM" INTEGER NOT NULL DEFAULT 0,
    "elevationLossM" INTEGER NOT NULL DEFAULT 0,
    "difficulty" "RouteDifficulty" NOT NULL DEFAULT 'MODERATE',
    "icon" TEXT NOT NULL DEFAULT 'walk-outline',
    "description" TEXT NOT NULL,
    "pointsOfInterest" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

