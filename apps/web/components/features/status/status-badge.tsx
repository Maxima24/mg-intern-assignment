import { CheckCircle2, Clock, Loader2, PenLine } from 'lucide-react';
import { SIGNATURE_STATUS_LABELS, type SetuSignatureStatus } from '@mango/shared';
import { Badge, type BadgeProps } from '@/components/ui/badge';

const CONFIG: Record<
  string,
  { variant: BadgeProps['variant']; icon: React.ReactNode; spin?: boolean }
> = {
  sign_initiated: { variant: 'info', icon: <Clock className="h-3 w-3" /> },
  sign_pending: { variant: 'pending', icon: <PenLine className="h-3 w-3" /> },
  sign_in_progress: { variant: 'pending', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  sign_complete: { variant: 'success', icon: <CheckCircle2 className="h-3 w-3" /> },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? { variant: 'neutral' as const, icon: null };
  const label = SIGNATURE_STATUS_LABELS[status as SetuSignatureStatus] ?? status;
  return (
    <Badge variant={cfg.variant}>
      {cfg.icon}
      {label}
    </Badge>
  );
}
