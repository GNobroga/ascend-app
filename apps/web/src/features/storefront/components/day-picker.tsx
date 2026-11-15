import { Button } from '@packages/ui/components/button';
import { cn } from '@packages/ui/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import type { BusinessHour } from '@/features/businesses';
import { daysFrom, shiftDateKey, toDateKey, todayKey } from '../booking-dates';

const DAYS_PER_PAGE = 7;

type DayPickerProps = {
  labelId: string;
  value: string;
  timeZone: string;
  hours: BusinessHour[];
  onChange: (date: string) => void;
};

export function DayPicker({ labelId, value, timeZone, hours, onChange }: DayPickerProps) {
  const today = todayKey(timeZone);
  const [pageStart, setPageStart] = useState(today);
  const closedDays = new Set<number>(hours.filter(({ isClosed }) => isClosed).map(({ dayOfWeek }) => dayOfWeek));
  const days = daysFrom(pageStart, DAYS_PER_PAGE, timeZone);
  const isFirstPage = pageStart <= today;

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Dias anteriores"
        disabled={isFirstPage}
        onClick={() => setPageStart(shiftDateKey(pageStart, -DAYS_PER_PAGE, timeZone))}
      >
        <ChevronLeftIcon />
      </Button>

      <div role="radiogroup" aria-labelledby={labelId} className="grid flex-1 grid-cols-7 gap-1">
        {days.map((day) => {
          const key = toDateKey(day);
          const isClosed = closedDays.has(day.getDay());
          const isSelected = key === value;
          return (
            <label
              key={key}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/30',
                isSelected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
                isClosed && 'cursor-not-allowed opacity-40 hover:bg-transparent',
              )}
            >
              <input
                type="radio"
                name="booking-day"
                value={key}
                checked={isSelected}
                disabled={isClosed}
                className="sr-only"
                onChange={() => onChange(key)}
              />
              <span className="text-xs capitalize">{format(day, 'EEE', { locale: ptBR }).replace('.', '')}</span>
              <span className="text-lg leading-none font-semibold tabular-nums">{format(day, 'd')}</span>
              <span className="text-xs">{format(day, 'MMM', { locale: ptBR }).replace('.', '')}</span>
              <span className="sr-only">
                {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
                {isClosed && ', fechado'}
              </span>
            </label>
          );
        })}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Próximos dias"
        onClick={() => setPageStart(shiftDateKey(pageStart, DAYS_PER_PAGE, timeZone))}
      >
        <ChevronRightIcon />
      </Button>
    </div>
  );
}
