-- CreateTable
CREATE TABLE "signature_requests" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "signature_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "document_name" TEXT,
    "signer_name" TEXT NOT NULL,
    "signer_identifier" TEXT NOT NULL,
    "birth_year" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sign_initiated',
    "signer_status" TEXT NOT NULL DEFAULT 'pending',
    "signer_url" TEXT NOT NULL,
    "signature_details" JSONB,
    "raw_setu" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signature_requests_signature_id_key" ON "signature_requests"("signature_id");

-- CreateIndex
CREATE INDEX "signature_requests_document_id_idx" ON "signature_requests"("document_id");

-- CreateIndex
CREATE INDEX "signature_requests_status_idx" ON "signature_requests"("status");
