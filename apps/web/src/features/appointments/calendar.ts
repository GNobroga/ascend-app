import { TZDate } from '@date-fns/tz';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  setHours,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AppointmentRange } from './api/appointments.api';

export const APPOINTMENT_VIEWS = ['day', 'week', 'month', 'board'] as const;

export type AppointmentView = (typeof APPOINTMENT_VIEWS)[number];

export const APPOINTMENT_VIEW_LABELS: Record<AppointmentView, string> = {
  day: 'Dia',
  week: 'Semana',
  month: 'Mês',
  board: 'Quadro',
};

const isSingleDay = (view: AppointmentView) => view === 'day' || view === 'board';

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const WEEK_OPTIONS = { weekStartsOn: 0, locale: ptBR } as const;

export const MINUTES_PER_DAY = 24 * 60;

export const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');

export const todayKey = (timeZone: string) => toDateKey(TZDate.tz(timeZone));

export const fromDateKey = (key: string, timeZone: string) => {
  const [year = 0, month = 1, day = 1] = (DATE_KEY_PATTERN.test(key) ? key : todayKey(timeZone)).split('-').map(Number);
  return new TZDate(year, month - 1, day, timeZone);
};

export const middayOf = (key: string, timeZone: string) => setHours(fromDateKey(key, timeZone), 12);

export const toZoned = (value: string, timeZone: string) => new TZDate(value, timeZone);

export const minutesOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

const visibleInterval = (view: AppointmentView, date: TZDate) => {
  if (isSingleDay(view)) return { start: startOfDay(date), end: startOfDay(date) };
  if (view === 'week') return { start: startOfWeek(date, WEEK_OPTIONS), end: endOfWeek(date, WEEK_OPTIONS) };
  return { start: startOfWeek(startOfMonth(date), WEEK_OPTIONS), end: endOfWeek(endOfMonth(date), WEEK_OPTIONS) };
};

export const visibleDays = (view: AppointmentView, date: TZDate) =>
  eachDayOfInterval(visibleInterval(view, date)).map((day) => new TZDate(day, date.timeZone));

const DAY_PERIOD = { start: (date: TZDate) => startOfDay(date), shift: (date: TZDate, amount: number) => addDays(date, amount) };

const VIEW_PERIOD: Record<AppointmentView, { start: (date: TZDate) => TZDate; shift: (date: TZDate, amount: number) => TZDate }> = {
  day: DAY_PERIOD,
  board: DAY_PERIOD,
  week: { start: (date) => startOfWeek(date, WEEK_OPTIONS), shift: (date, amount) => addWeeks(date, amount) },
  month: { start: (date) => startOfMonth(date), shift: (date, amount) => addMonths(date, amount) },
};

export const fetchRange = (view: AppointmentView, date: TZDate): AppointmentRange => {
  const { start, shift } = VIEW_PERIOD[view];
  const from = start(date);
  return { from: from.toISOString(), to: shift(from, 1).toISOString() };
};

export const shiftDate = (view: AppointmentView, date: TZDate, amount: number) => VIEW_PERIOD[view].shift(date, amount);

export const formatRangeLabel = (view: AppointmentView, date: TZDate) => {
  if (isSingleDay(view)) return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  if (view === 'month') return format(date, "MMMM 'de' yyyy", { locale: ptBR });

  const start = startOfWeek(date, WEEK_OPTIONS);
  const end = endOfWeek(date, WEEK_OPTIONS);
  return start.getMonth() === end.getMonth()
    ? `${format(start, 'd')} – ${format(end, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
    : `${format(start, "d 'de' MMM", { locale: ptBR })} – ${format(end, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
};

export const formatShortRangeLabel = (view: AppointmentView, date: TZDate) => {
  if (isSingleDay(view)) return format(date, "EEEEEE, d 'de' MMM", { locale: ptBR });
  if (view === 'month') return format(date, 'MMM yyyy', { locale: ptBR });

  const start = startOfWeek(date, WEEK_OPTIONS);
  const end = endOfWeek(date, WEEK_OPTIONS);
  return start.getMonth() === end.getMonth()
    ? `${format(start, 'd')} – ${format(end, 'd MMM', { locale: ptBR })}`
    : `${format(start, 'd MMM', { locale: ptBR })} – ${format(end, 'd MMM', { locale: ptBR })}`;
};

export const formatWeekday = (date: Date) => format(date, 'EEE', { locale: ptBR });

export const formatTime = (date: Date) => format(date, 'HH:mm');

export const formatDayHeading = (date: Date) => format(date, "EEEE, d 'de' MMMM", { locale: ptBR });

export const isSameDate = isSameDay;

export const timeToMinutes = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export type MinuteRange = {
  start: number;
  end: number;
};

export const dayMinuteRange = (startAt: string, endAt: string, day: Date, timeZone: string): MinuteRange | null => {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  const start = Math.max(new Date(startAt).getTime(), dayStart);
  const end = Math.min(new Date(endAt).getTime(), dayEnd);
  if (end <= start) return null;

  return {
    start: minutesOfDay(new TZDate(start, timeZone)),
    end: end === dayEnd ? MINUTES_PER_DAY : minutesOfDay(new TZDate(end, timeZone)),
  };
};

export type Lane = {
  lane: number;
  lanes: number;
};

export const assignLanes = <T extends MinuteRange>(items: T[]): Array<T & Lane> => {
  const sorted = items.toSorted((a, b) => a.start - b.start || b.end - a.end);
  const result: Array<T & Lane> = [];
  let cluster: Array<T & Lane> = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];

  const closeCluster = () => {
    const lanes = laneEnds.length;
    for (const item of cluster) item.lanes = lanes;
    result.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const item of sorted) {
    if (item.start >= clusterEnd && cluster.length > 0) closeCluster();
    const free = laneEnds.findIndex((end) => end <= item.start);
    const lane = free === -1 ? laneEnds.length : free;
    laneEnds[lane] = item.end;
    cluster.push({ ...item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  if (cluster.length > 0) closeCluster();
  return result;
};

export const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

export const freeTimeStart = (dateKey: string, todayDateKey: string, nowMinutes: number) => {
  if (dateKey === todayDateKey) return nowMinutes;
  return dateKey < todayDateKey ? MINUTES_PER_DAY : 0;
};
