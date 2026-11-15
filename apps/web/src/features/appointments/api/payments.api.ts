import { api } from '@/shared/api/http';
import type { Payment } from '../types';

export type RegisterPaymentRequest = {
  paymentMethodId: string;
  amount: number;
  notes: string | null;
  paidAt?: string;
};

const paymentsPath = (businessId: string, appointmentId: string) =>
  `/businesses/${businessId}/appointments/${appointmentId}/payments`;

export const paymentsApi = {
  list: (businessId: string, appointmentId: string) => api.get<Payment[]>(paymentsPath(businessId, appointmentId)),
  register: (businessId: string, appointmentId: string, body: RegisterPaymentRequest) =>
    api.post<Payment>(paymentsPath(businessId, appointmentId), body),
  refund: (businessId: string, appointmentId: string, paymentId: string, reason: string | null) =>
    api.post<Payment>(`${paymentsPath(businessId, appointmentId)}/${paymentId}/refund`, { reason }),
  cancel: (businessId: string, appointmentId: string, paymentId: string, reason: string | null) =>
    api.post<Payment>(`${paymentsPath(businessId, appointmentId)}/${paymentId}/cancel`, { reason }),
};
