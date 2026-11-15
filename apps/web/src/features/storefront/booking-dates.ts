import { TZDate } from '@date-fns/tz';
import { addDays, format } from 'date-fns';

export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

export const todayKey = (timeZone: string) => toDateKey(TZDate.tz(timeZone));

export const fromDateKey = (key: string, timeZone: string) => {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new TZDate(year, month - 1, day, timeZone);
};

export const daysFrom = (startKey: string, count: number, timeZone: string) => {
  const start = fromDateKey(startKey, timeZone);
  return Array.from({ length: count }, (_, index) => addDays(start, index));
};

export const shiftDateKey = (key: string, amount: number, timeZone: string) =>
  toDateKey(addDays(fromDateKey(key, timeZone), amount));
