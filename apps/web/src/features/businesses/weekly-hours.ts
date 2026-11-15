import type { TimeRange, WeeklyHoursValues } from './schemas';
import { Weekday } from './types';

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  [Weekday.SUNDAY]: 'Domingo',
  [Weekday.MONDAY]: 'Segunda-feira',
  [Weekday.TUESDAY]: 'Terça-feira',
  [Weekday.WEDNESDAY]: 'Quarta-feira',
  [Weekday.THURSDAY]: 'Quinta-feira',
  [Weekday.FRIDAY]: 'Sexta-feira',
  [Weekday.SATURDAY]: 'Sábado',
};

export const DISPLAY_ORDER: Weekday[] = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
  Weekday.SUNDAY,
];

export const ALL_WEEKDAYS = Object.values(Weekday);

export const DEFAULT_RANGE: TimeRange = { openTime: '09:00', closeTime: '18:00' };

type WeeklyDay = {
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

export const toWeeklyHoursValues = (dayOf: (dayOfWeek: Weekday) => WeeklyDay): WeeklyHoursValues => ({
  hours: ALL_WEEKDAYS.map((dayOfWeek) => {
    const day = dayOf(dayOfWeek);
    return {
      dayOfWeek,
      isClosed: day.isClosed,
      openTime: day.openTime ?? '',
      closeTime: day.closeTime ?? '',
    };
  }),
});

export const toTimeRange = (day: WeeklyDay): TimeRange | null =>
  !day.isClosed && day.openTime && day.closeTime ? { openTime: day.openTime, closeTime: day.closeTime } : null;
