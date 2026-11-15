import { createLoader, parseAsArrayOf, parseAsBoolean, parseAsString, parseAsStringLiteral } from 'nuqs';
import { APPOINTMENT_VIEWS } from './calendar';

export const appointmentsSearchParams = {
  view: parseAsStringLiteral(APPOINTMENT_VIEWS).withDefault('day'),
  date: parseAsString,
  professionals: parseAsArrayOf(parseAsString).withDefault([]),
  cancelled: parseAsBoolean.withDefault(false),
  appointment: parseAsString,
};

export const loadAppointmentsSearchParams = createLoader(appointmentsSearchParams);
