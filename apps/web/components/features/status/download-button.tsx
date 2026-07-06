'use client';

import { Download } from 'lucide-react';
import { esignApi } from '@/lib/api/esign';
import { Button } from '@/components/ui/button';

export function DownloadButton({ id }: { id: string }) {
  return (
    <a href={esignApi.downloadHref(id)} download>
      <Button className="w-full sm:w-auto">
        <Download className="h-4 w-4" />
        Download signed PDF
      </Button>
    </a>
  );
}
