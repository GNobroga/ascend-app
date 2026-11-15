import { TZDate } from '@date-fns/tz';
import { FieldDescription } from '@packages/ui/components/field';
import { Spinner } from '@packages/ui/components/spinner';
import { cn } from '@packages/ui/lib/utils';
import { format } from 'date-fns';
import type { PublicAvailabilitySlot } from '../types';

const PERIODS = [
  { label: 'Manhã', until: 12 },
  { label: 'Tarde', until: 18 },
  { label: 'Noite', until: 24 },
];

type SlotPickerProps = {
  slots: PublicAvailabilitySlot[];
  value: string;
  timeZone: string;
  isLoading: boolean;
  emptyMessage: string;
  onChange: (startAt: string) => void;
};

export function SlotPicker({ slots, value, timeZone, isLoading, emptyMessage, onChange }: SlotPickerProps) {
  if (isLoading) return <Spinner className="text-muted-foreground" />;
  if (slots.length === 0) return <FieldDescription>{emptyMessage}</FieldDescription>;

  const zoned = slots.map((slot) => ({ slot, start: new TZDate(slot.startAt, timeZone) }));
  const groups = PERIODS.map((period, index) => ({
    label: period.label,
    items: zoned.filter(({ start }) => {
      const hour = start.getHours();
      return hour < period.until && hour >= (PERIODS[index - 1]?.until ?? 0);
    }),
  })).filter(({ items }) => items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <span id={`slots-${group.label}`} className="text-xs font-medium text-muted-foreground uppercase">
            {group.label}
          </span>
          <div role="radiogroup" aria-labelledby={`slots-${group.label}`} className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {group.items.map(({ slot, start }) => {
              const isSelected = slot.startAt === value;
              return (
                <label
                  key={slot.startAt}
                  className={cn(
                    'flex h-9 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium tabular-nums transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/30',
                    isSelected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
                  )}
                >
                  <input
                    type="radio"
                    name="booking-slot"
                    value={slot.startAt}
                    checked={isSelected}
                    className="sr-only"
                    onChange={() => onChange(slot.startAt)}
                  />
                  {format(start, 'HH:mm')}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
