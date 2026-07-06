import type { Metadata } from 'next';
import { UploadContractForm } from '@/components/features/upload/upload-contract-form';

export const metadata: Metadata = {
  title: 'Upload contract — Mango eSign',
};

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upload a contract</h1>
        <p className="mt-1.5 text-muted-foreground">
          Send a PDF for Aadhaar eSign and get a signing link back instantly.
        </p>
      </div>
      <UploadContractForm />
    </div>
  );
}
