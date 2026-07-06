'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isTerminalStatus } from '@mango/shared';
import { ApiError } from '@/lib/api/client';
import { esignApi } from '@/lib/api/esign';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DownloadButton } from './download-button';
import { StatusBadge } from './status-badge';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-sm">{value}</span>
    </div>
  );
}

export function SignatureStatusCard({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ['signature-status', id],
    queryFn: () => esignApi.status(id),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (q) => (q.state.data && !isTerminalStatus(q.state.data.status) ? 4000 : false),
  });

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-10 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Fetching status…
        </CardContent>
      </Card>
    );
  }

  if (query.isError) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-8">
          <AlertCircle className="mt-0.5 h-5 w-5 text-danger" />
          <div>
            <p className="font-medium">
              {notFound ? 'No signature request found' : 'Could not load status'}
            </p>
            <p className="text-sm text-muted-foreground">
              {notFound
                ? `We couldn't find a request for "${id}". Check the ID and try again.`
                : 'Please retry in a moment.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const record = query.data;
  if (!record) return null;
  const complete = record.status === 'sign_complete';
  const polling = !isTerminalStatus(record.status);

  return (
    <Card className="animate-[var(--animate-fade-in)]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="truncate">{record.documentName ?? record.fileName}</CardTitle>
          <StatusBadge status={record.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="divide-y divide-border rounded-lg bg-surface-2 px-4">
          <Row label="Signature ID" value={record.signatureId} />
          <Row label="Document ID" value={record.documentId} />
          <Row label="Signer" value={record.signerName} />
          <Row label="Created" value={formatDateTime(record.createdAt)} />
          <Row label="Updated" value={formatDateTime(record.updatedAt)} />
        </div>

        {complete && record.signatureDetails && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-4">
            <p className="mb-2 text-sm font-medium text-success">Aadhaar signature verified</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {record.signatureDetails.aadhaarName && (
                <>
                  <span className="text-muted-foreground">Name</span>
                  <span>{record.signatureDetails.aadhaarName}</span>
                </>
              )}
              {record.signatureDetails.aadhaarSuffix && (
                <>
                  <span className="text-muted-foreground">Aadhaar</span>
                  <span>••••••••{record.signatureDetails.aadhaarSuffix}</span>
                </>
              )}
              {record.signatureDetails.gender && (
                <>
                  <span className="text-muted-foreground">Gender</span>
                  <span>{record.signatureDetails.gender}</span>
                </>
              )}
              {record.signatureDetails.postalCode && (
                <>
                  <span className="text-muted-foreground">Postal code</span>
                  <span>{record.signatureDetails.postalCode}</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {polling ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Auto-refreshing every 4s
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </Button>
            )}
          </div>
          {complete ? (
            <DownloadButton id={record.signatureId} />
          ) : (
            <a href={record.signerUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">Open signing page</Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
