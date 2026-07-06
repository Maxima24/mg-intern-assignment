import Link from 'next/link';
import {
  ArrowRight,
  DownloadCloud,
  FileSignature,
  RadioTower,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const STEPS = [
  {
    icon: UploadCloud,
    title: 'Upload a contract',
    body: 'Drop a PDF. We validate it, store our own copy, and send it to Setu — the browser never touches Setu directly.',
  },
  {
    icon: FileSignature,
    title: 'Sign with Aadhaar',
    body: 'The signer opens a hosted Setu page, verifies with Aadhaar OTP, and eSigns. You get a signing link instantly.',
  },
  {
    icon: RadioTower,
    title: 'Track in real time',
    body: 'Status updates as the signer progresses — initiated, pending, in progress, complete — via polling and webhooks.',
  },
  {
    icon: DownloadCloud,
    title: 'Download the signed PDF',
    body: 'Once complete, download the Aadhaar-signed document, streamed back through our backend.',
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              'radial-gradient(60% 55% at 50% -10%, color-mix(in oklab, var(--primary) 22%, transparent), transparent)',
          }}
        />
        <div className="mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <span className="inline-flex animate-[var(--animate-fade-in)] items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Aadhaar eSign, powered by Setu
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl animate-[var(--animate-rise)] text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            Send contracts for <span className="text-primary">Aadhaar eSign</span> in minutes.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Upload a PDF, generate a legally-backed Aadhaar signing link, watch the status update
            live, and download the signed document — all through a secure backend that keeps your
            Setu credentials server-side.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/upload">
              <Button size="lg" className="w-full sm:w-auto">
                Upload a contract
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/status">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Track a signature
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Card key={step.title} className="p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <step.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">0{i + 1}</span>
                <h3 className="font-semibold">{step.title}</h3>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-6 flex flex-col items-center justify-between gap-4 bg-surface-2 p-6 sm:flex-row sm:p-8">
          <div>
            <h3 className="text-lg font-semibold">Ready to try it?</h3>
            <p className="text-sm text-muted-foreground">
              Runs end-to-end in a safe sandbox — no credentials needed to explore the full flow.
            </p>
          </div>
          <Link href="/upload">
            <Button size="lg">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
