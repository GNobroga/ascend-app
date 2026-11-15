import { TZDate } from '@date-fns/tz';
import { addDays, differenceInCalendarDays, format, isSameDay, parse, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TimeOffRequest } from './api/professionals.api';
import type { TimeOffValues } from './schemas';
import { ProfessionalTimeOffType, type ProfessionalTimeOff } from './types';

export const TIME_OFF_TYPE_LABELS: Record<ProfessionalTimeOffType, string> = {
  [ProfessionalTimeOffType.VACATION]: 'Férias',
  [ProfessionalTimeOffType.DAY_OFF]: 'Folga',
  [ProfessionalTimeOffType.SICK_LEAVE]: 'Licença médica',
  [ProfessionalTimeOffType.PERSONAL]: 'Compromisso pessoal',
  [ProfessionalTimeOffType.OTHER]: 'Outro',
};

export const TIME_OFF_TYPES = Object.values(ProfessionalTimeOffType);

export const TIME_OFF_TYPE_OPTIONS = TIME_OFF_TYPES.map((value) => ({ value, label: TIME_OFF_TYPE_LABELS[value] }));

const DATE_FORMAT = 'yyyy-MM-dd';

const TIME_FORMAT = 'HH:mm';

const isMidnight = (date: Date) => date.getTime() === startOfDay(date).getTime();

const isAllDay = (start: Date, end: Date) => isMidnight(start) && isMidnight(end);

const parseDate = (date: string, timeZone: string) => parse(date, DATE_FORMAT, TZDate.tz(timeZone));

const parseDateTime = (date: string, time: string, timeZone: string) =>
  parse(`${date} ${time}`, `${DATE_FORMAT} ${TIME_FORMAT}`, TZDate.tz(timeZone));

export const toTimeOffFormValues = (timeZone: string, timeOff?: ProfessionalTimeOff): TimeOffValues => {
  if (!timeOff) {
    const today = format(TZDate.tz(timeZone), DATE_FORMAT);
    return {
      type: ProfessionalTimeOffType.VACATION,
      allDay: true,
      startDate: today,
      endDate: today,
      startTime: '09:00',
      endTime: '18:00',
      reason: '',
    };
  }

  const start = new TZDate(timeOff.startAt, timeZone);
  const end = new TZDate(timeOff.endAt, timeZone);
  const allDay = isAllDay(start, end);
  return {
    type: timeOff.type,
    allDay,
    startDate: format(start, DATE_FORMAT),
    endDate: format(allDay ? subDays(end, 1) : end, DATE_FORMAT),
    startTime: allDay ? '09:00' : format(start, TIME_FORMAT),
    endTime: allDay ? '18:00' : format(end, TIME_FORMAT),
    reason: timeOff.reason ?? '',
  };
};

export const toTimeOffRequest = (values: TimeOffValues, timeZone: string): TimeOffRequest => {
  const startAt = values.allDay
    ? parseDate(values.startDate, timeZone)
    : parseDateTime(values.startDate, values.startTime, timeZone);
  const endAt = values.allDay
    ? addDays(parseDate(values.endDate, timeZone), 1)
    : parseDateTime(values.endDate, values.endTime, timeZone);

  return {
    type: values.type,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    reason: values.reason || null,
  };
};

const formatDay = (date: Date) => format(date, "d 'de' MMM 'de' yyyy", { locale: ptBR });

const formatTime = (date: Date) => format(date, TIME_FORMAT);

export const formatTimeOffPeriod = ({ startAt, endAt }: ProfessionalTimeOff, timeZone: string) => {
  const start = new TZDate(startAt, timeZone);
  const end = new TZDate(endAt, timeZone);

  if (isAllDay(start, end)) {
    const lastDay = subDays(end, 1);
    const days = differenceInCalendarDays(end, start);
    return isSameDay(start, lastDay)
      ? `${formatDay(start)} · dia inteiro`
      : `${formatDay(start)} a ${formatDay(lastDay)} · ${days} dias`;
  }

  return isSameDay(start, end)
    ? `${formatDay(start)}, ${formatTime(start)} às ${formatTime(end)}`
    : `${formatDay(start)}, ${formatTime(start)} a ${formatDay(end)}, ${formatTime(end)}`;
};

export const isTimeOffOngoing = ({ startAt, endAt }: ProfessionalTimeOff, now: Date) =>
  new Date(startAt) <= now && now < new Date(endAt);

export const isTimeOffPast = ({ endAt }: ProfessionalTimeOff, now: Date) => new Date(endAt) <= now;
