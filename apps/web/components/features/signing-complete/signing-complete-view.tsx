'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { isTerminalStatus } from '@mango/shared';
import { esignApi } from '@/lib/api/esign';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DownloadButton } from '@/components/features/status/download-button';
import { StatusBadge } from '@/components/features/status/status-badge';

/**
 * Setu redirects the signer here after signing. The query params (success, errCode)
 * are hints only — we re-fetch the true status from our backend (which may briefly
 * lag the redirect, so we keep polling until terminal).
 */
export function SigningCompleteView({
  id,
  success,
  errorMessage,
}: {
  id?: string;
  success: boolean;
  errorMessage?: string;
}) {
  const query = useQuery({
    queryKey: ['signature-status', id],
    queryFn: () => esignApi.status(id as string),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data && !isTerminalStatus(q.state.data.status) ? 2500 : false),
  });

  if (!success) {
    return (
      <Shell>
        <XCircle className="h-12 w-12 text-danger" />
        <h1 className="mt-4 text-2xl font-bold">Signing was not completed</h1>
        <p className="mt-2 text-muted-foreground">
          {errorMessage ?? 'The signer did not finish the Aadhaar eSign flow.'}
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/upload">
            <Button>Try again</Button>
          </Link>
          {id && (
            <Link href={`/status?id=${encodeURIComponent(id)}`}>
              <Button variant="outline">View status</Button>
            </Link>
          )}
        </div>
      </Shell>
    );
  }

  const record = query.data;
  const complete = record?.status === 'sign_complete';

  return (
    <Shell>
      {complete ? (
        <CheckCircle2 className="h-12 w-12 text-success" />
      ) : (
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      )}
      <h1 className="mt-4 text-2xl font-bold">
        {complete ? 'Document signed' : 'Finalising your signature…'}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {complete
          ? 'The Aadhaar eSign is complete. You can download the signed document now.'
          : "Thanks for signing. We're confirming the status with the provider."}
      </p>

      {record && (
        <div className="mt-5">
          <StatusBadge status={record.status} />
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {complete && id && <DownloadButton id={id} />}
        {id && (
          <Link href={`/status?id=${encodeURIComponent(id)}`}>
            <Button variant="outline">View full status</Button>
          </Link>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <Card className="flex flex-col items-center p-10">
        <CardContent className="flex flex-col items-center p-0">{children}</CardContent>
      </Card>
    </div>
  );
}
