'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText, Inbox } from 'lucide-react';
import { esignApi } from '@/lib/api/esign';
import { cn, formatRelative } from '@/lib/utils';
import { StatusBadge } from './status-badge';

export function RecentRequestsList({
  activeId,
  onSelect,
}: {
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const query = useQuery({ queryKey: ['recent-signatures'], queryFn: () => esignApi.recent(15) });

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  const items = query.data ?? [];
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        <Inbox className="h-6 w-6" />
        No requests yet. Upload a contract to get started.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((r) => (
        <li key={r.signatureId}>
          <button
            type="button"
            onClick={() => onSelect(r.signatureId)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
              activeId === r.signatureId
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-surface-2',
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileText className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {r.documentName ?? r.fileName}
              </span>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {r.signatureId} · {formatRelative(r.createdAt)}
              </span>
            </span>
            <StatusBadge status={r.status} />
          </button>
        </li>
      ))}
    </ul>
  );
}
