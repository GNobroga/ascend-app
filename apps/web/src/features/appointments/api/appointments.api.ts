import { api } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type { Appointment, AppointmentStatus, Availability } from '../types';

export const CUSTOMER_HISTORY_PAGE_SIZE = 10;

export type AppointmentRange = {
  from: string;
  to: string;
};

export type ChangeAppointmentStatusRequest = {
  status: AppointmentStatus;
  reason?: string | null;
};

export type AvailabilityQuery = {
  date: string;
  serviceIds?: string[];
  packageId?: string;
  professionalId?: string;
};

export type CreateAppointmentRequest = {
  customerId: string;
  professionalId: string;
  serviceIds?: string[];
  packageId?: string;
  startAt: string;
  internalNotes: string | null;
};

export type UpdateAppointmentRequest = {
  startAt?: string;
  professionalId?: string;
  internalNotes?: string | null;
};

export type CustomerAppointmentSummary = {
  totalCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  totalSpent: number;
  averageTicket: number | null;
  lastVisitAt: string | null;
  nextAppointmentAt: string | null;
};

const appointmentsPath = (businessId: string) => `/businesses/${businessId}/appointments`;

const customerAppointmentsPath = (businessId: string, customerId: string) =>
  `/businesses/${businessId}/customers/${customerId}/appointments`;

export const appointmentsApi = {
  list: (businessId: string, { from, to }: AppointmentRange, status?: AppointmentStatus) =>
    api.get<Appointment[]>(appointmentsPath(businessId), { params: { from, to, status } }),
  listByCustomer: (businessId: string, customerId: string, status: AppointmentStatus | null, page: number) =>
    api.get<Paginated<Appointment>>(customerAppointmentsPath(businessId, customerId), {
      params: { status: status ?? undefined, page, pageSize: CUSTOMER_HISTORY_PAGE_SIZE },
    }),
  summarizeByCustomer: (businessId: string, customerId: string) =>
    api.get<CustomerAppointmentSummary>(`${customerAppointmentsPath(businessId, customerId)}/summary`),
  getById: (businessId: string, appointmentId: string) =>
    api.get<Appointment>(`${appointmentsPath(businessId)}/${appointmentId}`),
  create: (businessId: string, body: CreateAppointmentRequest) =>
    api.post<Appointment>(appointmentsPath(businessId), body),
  setServices: (businessId: string, appointmentId: string, serviceIds: string[]) =>
    api.put<Appointment>(`${appointmentsPath(businessId)}/${appointmentId}/services`, { serviceIds }),
  update: (businessId: string, appointmentId: string, body: UpdateAppointmentRequest) =>
    api.patch<Appointment>(`${appointmentsPath(businessId)}/${appointmentId}`, body),
  changeStatus: (businessId: string, appointmentId: string, body: ChangeAppointmentStatusRequest) =>
    api.post<Appointment>(`${appointmentsPath(businessId)}/${appointmentId}/status`, body),
  availability: (businessId: string, { serviceIds, ...query }: AvailabilityQuery) =>
    api.get<Availability>(`/businesses/${businessId}/availability`, {
      params: { ...query, serviceIds: serviceIds?.join(',') },
    }),
};
