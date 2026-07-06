export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>Mango eSign — Setu Aadhaar eSign integration.</p>
        <p>All Setu calls happen server-side. Credentials never reach the browser.</p>
      </div>
    </footer>
  );
}
