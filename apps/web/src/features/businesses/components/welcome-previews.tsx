import { cn } from '@packages/ui/lib/utils';
import { MailIcon } from 'lucide-react';

const SAMPLE_APPOINTMENTS = [
  { time: '09:00', service: 'Corte', customer: 'João', accent: 'bg-primary' },
  { time: '10:30', service: 'Barba', customer: 'Pedro', accent: 'bg-primary/60' },
  { time: '14:00', service: 'Corte e barba', customer: 'Ana', accent: 'bg-primary/30' },
];

export function AgendaPreview() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1.5 rounded-xl border bg-background/70 p-3 shadow-sm">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-medium">Hoje</span>
        <span className="text-[10px] text-muted-foreground">3 agendamentos</span>
      </div>
      {SAMPLE_APPOINTMENTS.map(({ time, service, customer, accent }) => (
        <div key={time} className="flex items-center gap-2 rounded-lg bg-muted/60 px-2 py-1.5">
          <span className="w-9 shrink-0 text-[11px] text-muted-foreground tabular-nums">{time}</span>
          <span className={cn('h-4 w-1 shrink-0 rounded-full', accent)} />
          <span className="truncate text-xs">
            <span className="font-medium">{service}</span>
            <span className="text-muted-foreground"> · {customer}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

type InvitePreviewProps = {
  email: string;
};

export function InvitePreview({ email }: InvitePreviewProps) {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-background/70 p-4 text-center shadow-sm"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <MailIcon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] text-muted-foreground">Convite para</span>
        <span className="max-w-full truncate text-xs font-medium">{email}</span>
      </span>
    </div>
  );
}
