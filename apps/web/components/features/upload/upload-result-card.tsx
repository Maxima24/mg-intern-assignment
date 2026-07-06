'use client';

import Link from 'next/link';
import { ArrowRight, Copy, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { SignatureRecord } from '@/lib/api/esign';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/features/status/status-badge';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success(`${label} copied`);
        }}
        className="group inline-flex items-center gap-1.5 font-mono text-sm hover:text-primary"
        title="Copy"
      >
        <span className="max-w-[14rem] truncate">{value}</span>
        <Copy className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </div>
  );
}

export function UploadResultCard({ record }: { record: SignatureRecord }) {
  const [showFrame, setShowFrame] = useState(false);

  return (
    <Card className="animate-[var(--animate-rise)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Signature request created</CardTitle>
          <StatusBadge status={record.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg bg-surface-2 px-4">
          <Field label="Document ID" value={record.documentId} />
          <Field label="Signature ID" value={record.signatureId} />
          <Field label="Signer" value={record.signerName} />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a href={record.signerUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button className="w-full">
              Open signing page
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <Button variant="outline" onClick={() => setShowFrame((v) => !v)}>
            {showFrame ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showFrame ? 'Hide embed' : 'Embed'}
          </Button>
        </div>

        {showFrame && (
          <iframe
            title="Setu signing"
            src={record.signerUrl}
            className="h-[28rem] w-full rounded-lg border border-border"
          />
        )}

        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3 text-sm">
          <span className="text-muted-foreground">Track this request live</span>
          <Link href={`/status?id=${encodeURIComponent(record.signatureId)}`}>
            <Button variant="ghost" size="sm">
              Go to status
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
