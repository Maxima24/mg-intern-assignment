-- AlterTable
ALTER TABLE "signature_requests" ADD COLUMN     "original_storage_key" TEXT,
ADD COLUMN     "signed_storage_key" TEXT;
