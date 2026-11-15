import type { BusinessHour } from '@/features/businesses';
import { TIME_OFF_TYPE_LABELS, type ProfessionalTimeOff, type ProfessionalWorkingHour } from '@/features/professionals';
import { dayMinuteRange, MINUTES_PER_DAY, timeToMinutes, type MinuteRange } from './calendar';
import type { GridShade } from './components/time-grid';

const DEFAULT_OPEN: MinuteRange = { start: 8 * 60, end: 20 * 60 };

const toRange = (start: string | null, end: string | null): MinuteRange | null =>
  start && end ? { start: timeToMinutes(start), end: timeToMinutes(end) } : null;

export const businessOpenRange = (hours: BusinessHour[], day: Date): MinuteRange | null => {
  const entry = hours.find(({ dayOfWeek }) => dayOfWeek === day.getDay());
  if (!entry) return hours.length === 0 ? DEFAULT_OPEN : null;
  return entry.isClosed ? null : toRange(entry.openTime, entry.closeTime);
};

export const workingRange = (
  workingHours: ProfessionalWorkingHour[] | undefined,
  businessHours: BusinessHour[],
  day: Date,
): MinuteRange | null => {
  if (!workingHours || workingHours.length === 0) return businessOpenRange(businessHours, day);
  const entry = workingHours.find(({ dayOfWeek }) => dayOfWeek === day.getDay());
  return entry && !entry.isDayOff ? toRange(entry.startTime, entry.endTime) : null;
};

export const closedShades = (open: MinuteRange | null, bounds: MinuteRange, closedLabel: string): GridShade[] => {
  if (!open) return [{ key: 'closed', ...bounds, variant: 'closed', label: closedLabel }];
  return [
    { key: 'before', start: bounds.start, end: Math.max(open.start, bounds.start), variant: 'closed' as const },
    { key: 'after', start: Math.min(open.end, bounds.end), end: bounds.end, variant: 'closed' as const },
  ].filter(({ start, end }) => end > start);
};

export const timeOffShades = (timeOffs: ProfessionalTimeOff[] | undefined, day: Date, timeZone: string): GridShade[] =>
  (timeOffs ?? []).flatMap((timeOff) => {
    const range = dayMinuteRange(timeOff.startAt, timeOff.endAt, day, timeZone);
    return range
      ? [{ key: `time-off-${timeOff.id}`, ...range, variant: 'time-off' as const, label: TIME_OFF_TYPE_LABELS[timeOff.type] }]
      : [];
  });

export const gridBounds = (hours: BusinessHour[], occupied: MinuteRange[]): MinuteRange => {
  const open = hours.flatMap((entry) => (entry.isClosed ? [] : [toRange(entry.openTime, entry.closeTime)])).filter(
    (range): range is MinuteRange => range !== null,
  );
  const ranges = [...(open.length > 0 ? open : [DEFAULT_OPEN]), ...occupied];
  const start = Math.min(...ranges.map((range) => range.start));
  const end = Math.max(...ranges.map((range) => range.end));
  return {
    start: Math.max(Math.floor(start / 60) * 60, 0),
    end: Math.min(Math.ceil(end / 60) * 60, MINUTES_PER_DAY),
  };
};

const MIN_FREE_MINUTES = 30;

const subtract = (ranges: MinuteRange[], cut: MinuteRange) =>
  ranges.flatMap((range) =>
    [
      { start: range.start, end: Math.min(range.end, cut.start) },
      { start: Math.max(range.start, cut.end), end: range.end },
    ].filter(({ start, end }) => end > start),
  );

const formatFreeDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
};

export const freeShades = (open: MinuteRange | null, busy: MinuteRange[], fromMinutes: number): GridShade[] => {
  if (!open) return [];
  const upcoming = subtract([open], { start: 0, end: fromMinutes });
  return busy
    .reduce(subtract, upcoming)
    .filter(({ start, end }) => end - start >= MIN_FREE_MINUTES)
    .map((range) => ({
      key: `free-${range.start}`,
      ...range,
      variant: 'free' as const,
      label: `Livre · ${formatFreeDuration(range.end - range.start)}`,
    }));
};
