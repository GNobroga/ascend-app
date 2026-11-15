import { toDateKey, toZoned } from './calendar';
import { appointmentsPath } from './loaders';
import type { Appointment } from './types';

export const appointmentLink = (businessId: string, appointment: Appointment, timeZone: string, todayKey: string) => {
  const dateKey = toDateKey(toZoned(appointment.startAt, timeZone));
  const params = new URLSearchParams({ appointment: appointment.id });
  if (dateKey !== todayKey) params.set('date', dateKey);
  return `${appointmentsPath(businessId)}?${params}`;
};
