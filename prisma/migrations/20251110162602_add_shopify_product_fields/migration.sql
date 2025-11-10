-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "compareAtPrice" DECIMAL(65,30),
ADD COLUMN     "featuredImage" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "handle" TEXT,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "vendor" TEXT;

-- CreateIndex
CREATE INDEX "products_handle_idx" ON "products"("handle");

-- CreateIndex
CREATE INDEX "products_vendor_idx" ON "products"("vendor");
