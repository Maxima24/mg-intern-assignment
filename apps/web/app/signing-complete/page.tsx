import type { Metadata } from 'next';
import { SigningCompleteView } from '@/components/features/signing-complete/signing-complete-view';

export const metadata: Metadata = {
  title: 'Signing complete — Mango eSign',
};

export default async function SigningCompletePage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
    success?: string;
    errCode?: string;
    errorMessage?: string;
  }>;
}) {
  const params = await searchParams;
  const success = params.success !== 'false' && params.errCode === undefined;
  return (
    <SigningCompleteView
      id={params.id}
      success={success}
      errorMessage={params.errorMessage ?? params.errCode}
    />
  );
}
