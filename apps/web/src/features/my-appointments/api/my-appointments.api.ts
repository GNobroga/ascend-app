import { api } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type { MyAppointment, MyReview } from '../types';

export type MyAppointmentScope = 'upcoming' | 'past';

export type CreateMyAppointmentRequest = {
  businessSlug: string;
  professionalId: string;
  startAt: string;
  customerNotes: string | null;
} & ({ serviceIds: string[] } | { packageId: string });

export type CancelMyAppointmentVariables = {
  appointmentId: string;
  reason: string | null;
};

export type ReviewMyAppointmentVariables = {
  appointmentId: string;
  rating: number;
  comment: string | null;
};

export const MY_APPOINTMENTS_PAGE_SIZE = 10;

export const myAppointmentsApi = {
  list: (scope: MyAppointmentScope, page: number) =>
    api.get<Paginated<MyAppointment>>('/me/appointments', {
      params: { upcoming: scope === 'upcoming', page, pageSize: MY_APPOINTMENTS_PAGE_SIZE },
    }),
  countAll: () =>
    api
      .get<Paginated<MyAppointment>>('/me/appointments', { params: { page: 1, pageSize: 1 } })
      .then(({ meta }) => meta.total),
  create: (body: CreateMyAppointmentRequest) => api.post<MyAppointment>('/me/appointments', body),
  cancel: ({ appointmentId, reason }: CancelMyAppointmentVariables) =>
    api.post<MyAppointment>(`/me/appointments/${appointmentId}/cancel`, { reason }),
  review: ({ appointmentId, rating, comment }: ReviewMyAppointmentVariables) =>
    api.put<MyReview>(`/me/appointments/${appointmentId}/review`, { rating, comment }),
};
