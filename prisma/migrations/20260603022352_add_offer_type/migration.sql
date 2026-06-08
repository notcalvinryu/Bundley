-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'QUANTITY_BREAKS',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "productId" TEXT,
    "productTitle" TEXT,
    "imageUrl" TEXT,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "headerText" TEXT,
    "theme" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Offer" ("basePrice", "createdAt", "headerText", "id", "imageUrl", "productId", "productTitle", "shop", "status", "theme", "title", "updatedAt") SELECT "basePrice", "createdAt", "headerText", "id", "imageUrl", "productId", "productTitle", "shop", "status", "theme", "title", "updatedAt" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
CREATE INDEX "Offer_shop_idx" ON "Offer"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
