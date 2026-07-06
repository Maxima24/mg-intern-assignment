'use client';

import { useState } from 'react';
import { RecentRequestsList } from './recent-requests-list';
import { SignatureStatusCard } from './signature-status-card';
import { StatusLookupForm } from './status-lookup-form';

export function StatusExplorer({ initialId }: { initialId?: string }) {
  const [activeId, setActiveId] = useState(initialId ?? '');

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <div className="space-y-6">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Look up by ID</h2>
          <StatusLookupForm initialValue={initialId} onSubmit={setActiveId} />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Previous requests</h2>
          <RecentRequestsList activeId={activeId} onSelect={setActiveId} />
        </div>
      </div>

      <div>
        {activeId ? (
          <SignatureStatusCard id={activeId} />
        ) : (
          <div className="flex h-full min-h-[16rem] items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Select a request or paste a Signature ID to see its live status.
          </div>
        )}
      </div>
    </div>
  );
}
