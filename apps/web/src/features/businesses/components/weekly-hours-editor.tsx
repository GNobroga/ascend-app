import { Button } from '@packages/ui/components/button';
import { FieldError } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { Switch } from '@packages/ui/components/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@packages/ui/components/tooltip';
import { CopyIcon } from 'lucide-react';
import { Controller, useFormState, useWatch, type Control, type UseFormReturn } from 'react-hook-form';
import { isValidTimeRange, type TimeRange, type WeeklyHoursReference, type WeeklyHoursValues } from '../schemas';
import { DEFAULT_RANGE, DISPLAY_ORDER, WEEKDAY_LABELS } from '../weekly-hours';

export type WeeklyHoursLabels = {
  open: string;
  closed: string;
  start: string;
  end: string;
  copyTarget: string;
  fillToCopy: string;
  locked?: string;
};

type WeeklyHoursEditorProps = {
  form: UseFormReturn<WeeklyHoursValues>;
  labels: WeeklyHoursLabels;
  reference?: WeeklyHoursReference;
};

export function WeeklyHoursEditor({ form, labels, reference }: WeeklyHoursEditorProps) {
  const fillEmptyTimes = (index: number) => {
    const day = form.getValues(`hours.${index}`);
    if (day.openTime || day.closeTime) return;

    const otherOpenDay = DISPLAY_ORDER.map((dayOfWeek) => form.getValues(`hours.${dayOfWeek}`)).find(
      (other) => other.dayOfWeek !== index && !other.isClosed && isValidTimeRange(other.openTime, other.closeTime),
    );
    const suggestion = reference?.[index] ?? otherOpenDay ?? DEFAULT_RANGE;
    form.setValue(`hours.${index}.openTime`, suggestion.openTime, { shouldDirty: true });
    form.setValue(`hours.${index}.closeTime`, suggestion.closeTime, { shouldDirty: true });
  };

  const copyToOpenDays = (sourceIndex: number) => {
    const source = form.getValues(`hours.${sourceIndex}`);
    form.getValues('hours').forEach((day, index) => {
      if (index === sourceIndex || day.isClosed) return;
      form.setValue(`hours.${index}.openTime`, source.openTime, { shouldDirty: true, shouldValidate: true });
      form.setValue(`hours.${index}.closeTime`, source.closeTime, { shouldDirty: true, shouldValidate: true });
    });
  };

  return (
    <>
      <TimelineHeader />
      <ul className="flex flex-col divide-y">
        {DISPLAY_ORDER.map((dayOfWeek) => (
          <WeeklyHoursRow
            key={dayOfWeek}
            control={form.control}
            index={dayOfWeek}
            label={WEEKDAY_LABELS[dayOfWeek]}
            labels={labels}
            reference={reference ? (reference[dayOfWeek] ?? null) : undefined}
            onOpen={() => fillEmptyTimes(dayOfWeek)}
            onCopy={() => copyToOpenDays(dayOfWeek)}
          />
        ))}
      </ul>
    </>
  );
}

const MINUTES_PER_DAY = 24 * 60;

const TIMELINE_TICKS = [0, 6, 12, 18, 24];

const ROW_GRID = 'lg:grid lg:grid-cols-[12rem_20.5rem_minmax(0,1fr)_3rem_2.25rem] lg:items-center lg:gap-6';

const toMinutes = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const toMinuteRange = ({ openTime, closeTime }: TimeRange) => ({ start: toMinutes(openTime), end: toMinutes(closeTime) });

const formatOpenDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
};

const rangeStyle = ({ start, end }: { start: number; end: number }) => ({
  left: `${(start / MINUTES_PER_DAY) * 100}%`,
  width: `${((end - start) / MINUTES_PER_DAY) * 100}%`,
});

function TimelineHeader() {
  return (
    <div aria-hidden="true" className={`hidden text-xs text-muted-foreground ${ROW_GRID}`}>
      <span />
      <span />
      <div className="relative h-4">
        {TIMELINE_TICKS.map((hour) => (
          <span
            key={hour}
            className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
            style={{ left: `${(hour / 24) * 100}%` }}
          >
            {hour}h
          </span>
        ))}
      </div>
      <span />
      <span />
    </div>
  );
}

type TimelineProps = {
  range: { start: number; end: number } | null;
  reference: { start: number; end: number } | null;
};

function Timeline({ range, reference }: TimelineProps) {
  return (
    <div aria-hidden="true" className="relative hidden h-2 rounded-full bg-muted lg:block">
      {TIMELINE_TICKS.slice(1, -1).map((hour) => (
        <span
          key={hour}
          className="absolute -top-1 h-4 w-px bg-border"
          style={{ left: `${(hour / 24) * 100}%` }}
        />
      ))}
      {reference && <span className="absolute inset-y-0 rounded-full bg-primary/15" style={rangeStyle(reference)} />}
      {range && (
        <span
          className="absolute inset-y-0 rounded-full bg-primary transition-[left,width] duration-200 motion-reduce:transition-none"
          style={rangeStyle(range)}
        />
      )}
    </div>
  );
}

const statusLabel = (labels: WeeklyHoursLabels, isClosed: boolean, isLocked: boolean) => {
  if (isLocked && labels.locked) return labels.locked;
  return isClosed ? labels.closed : labels.open;
};

type WeeklyHoursRowProps = {
  control: Control<WeeklyHoursValues>;
  index: number;
  label: string;
  labels: WeeklyHoursLabels;
  reference?: TimeRange | null;
  onOpen: () => void;
  onCopy: () => void;
};

function WeeklyHoursRow({ control, index, label, labels, reference, onOpen, onCopy }: WeeklyHoursRowProps) {
  const { isClosed, openTime, closeTime } = useWatch({ control, name: `hours.${index}` });
  const { errors } = useFormState({ control, name: `hours.${index}.isClosed` });
  const canCopy = isValidTimeRange(openTime, closeTime);
  const range = !isClosed && canCopy ? toMinuteRange({ openTime, closeTime }) : null;
  const isLocked = reference === null && isClosed;
  const switchId = `hours-${index}-open`;

  return (
    <li className={`flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:gap-4 ${ROW_GRID}`}>
      <div className="flex flex-col gap-1 sm:w-52 lg:w-auto">
        <div className="flex h-8 items-center gap-3">
          <Controller
            control={control}
            name={`hours.${index}.isClosed`}
            render={({ field }) => (
              <Switch
                id={switchId}
                checked={!field.value}
                disabled={isLocked}
                onCheckedChange={(checked) => {
                  field.onChange(!checked);
                  if (checked) onOpen();
                }}
              />
            )}
          />
          <label htmlFor={switchId} className="flex flex-col text-sm font-medium">
            {label}
            <span className="text-xs font-normal text-muted-foreground">
              {statusLabel(labels, isClosed, isLocked)}
            </span>
          </label>
        </div>
        <FieldError errors={[errors.hours?.[index]?.isClosed]} />
      </div>

      <div className="flex flex-1 items-start gap-2 lg:contents">
        {isClosed ? (
          <span className="hidden lg:block" />
        ) : (
          <div className="flex flex-1 items-start gap-2">
            <Controller
              control={control}
              name={`hours.${index}.openTime`}
              render={({ field, fieldState }) => (
                <div className="flex flex-1 flex-col gap-1 sm:w-36 sm:flex-none">
                  <Input
                    {...field}
                    type="time"
                    aria-label={`${labels.start} de ${label}`}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </div>
              )}
            />
            <span className="flex h-8 items-center text-sm text-muted-foreground">às</span>
            <Controller
              control={control}
              name={`hours.${index}.closeTime`}
              render={({ field, fieldState }) => (
                <div className="flex flex-1 flex-col gap-1 sm:w-36 sm:flex-none">
                  <Input
                    {...field}
                    type="time"
                    aria-label={`${labels.end} de ${label}`}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </div>
              )}
            />
          </div>
        )}

        <Timeline range={range} reference={reference ? toMinuteRange(reference) : null} />

        <span className="hidden text-right text-sm text-muted-foreground tabular-nums lg:block">
          {range ? formatOpenDuration(range.end - range.start) : '—'}
        </span>

        {isClosed ? (
          <span className="hidden lg:block" />
        ) : (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!canCopy}
                aria-label={`Copiar horário de ${label} para ${labels.copyTarget}`}
                onClick={onCopy}
              >
                <CopyIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {canCopy
                ? `Copiar este horário para ${labels.copyTarget}`
                : labels.fillToCopy}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </li>
  );
}
