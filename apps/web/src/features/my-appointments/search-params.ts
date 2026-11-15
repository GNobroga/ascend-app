import { createLoader, parseAsStringLiteral } from 'nuqs';
import type { MyAppointmentScope } from './api/my-appointments.api';

export const MY_APPOINTMENT_SCOPES = ['upcoming', 'past'] as const satisfies MyAppointmentScope[];

export const myAppointmentsSearchParams = {
  scope: parseAsStringLiteral(MY_APPOINTMENT_SCOPES),
};

export const loadMyAppointmentsSearchParams = createLoader(myAppointmentsSearchParams);
