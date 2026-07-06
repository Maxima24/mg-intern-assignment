import type { Metadata } from 'next';
import { StatusExplorer } from '@/components/features/status/status-explorer';

export const metadata: Metadata = {
  title: 'Track status — Mango eSign',
};

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Track a signature</h1>
        <p className="mt-1.5 text-muted-foreground">
          Enter a Signature ID or pick a previous request. Status refreshes automatically until it
          completes.
        </p>
      </div>
      <StatusExplorer initialId={id} />
    </div>
  );
}
