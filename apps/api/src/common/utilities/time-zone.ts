import type { Weekday } from '../enums/weekday.enum.js';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Data local `YYYY-MM-DD`. */
export const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formatters = new Map<string, Intl.DateTimeFormat>();

const formatterFor = (timeZone: string): Intl.DateTimeFormat => {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
};

const localParts = (instant: Date, timeZone: string) => {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
};

const offsetMs = (instant: Date, timeZone: string): number => {
  const p = localParts(instant, timeZone);
  const localAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
  );
  return localAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
};

const parseDate = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return { year, month, day };
};

/**
 * Instante UTC de uma data e hora locais (`HH:mm`) em `timeZone`.
 * O offset é recalculado no instante obtido para acertar os dias de mudança de horário de verão.
 */
export const zonedTimeToUtc = (
  date: string,
  time: string,
  timeZone: string,
): Date => {
  const { year, month, day } = parseDate(date);
  const [hour, minute] = time.split(':').map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  const firstGuess = localAsUtc - offsetMs(new Date(localAsUtc), timeZone);
  return new Date(localAsUtc - offsetMs(new Date(firstGuess), timeZone));
};

/** Data local (`YYYY-MM-DD`) de um instante em `timeZone`. */
export const toLocalDate = (instant: Date, timeZone: string): string => {
  const { year, month, day } = localParts(instant, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const addDays = (date: string, days: number): string => {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
};

/** Dia da semana de uma data local (domingo = 0). Não depende de fuso. */
export const weekdayOf = (date: string): Weekday => {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as Weekday;
};
