'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function StatusLookupForm({
  initialValue,
  onSubmit,
}: {
  initialValue?: string;
  onSubmit: (id: string) => void;
}) {
  const [value, setValue] = useState(initialValue ?? '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = value.trim();
        if (trimmed) onSubmit(trimmed);
      }}
      className="flex gap-2"
    >
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter a Signature ID (sig_…)"
        className="font-mono"
      />
      <Button type="submit" variant="secondary">
        <Search className="h-4 w-4" />
        Track
      </Button>
    </form>
  );
}
