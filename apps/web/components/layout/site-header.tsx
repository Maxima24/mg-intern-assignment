import Link from 'next/link';
import { FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <FileSignature className="h-4.5 w-4.5" />
          </span>
          <span className="text-base">
            Mango<span className="text-primary">eSign</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1.5">
          <Link href="/status">
            <Button variant="ghost" size="sm">
              Track status
            </Button>
          </Link>
          <Link href="/upload">
            <Button size="sm">Upload contract</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
