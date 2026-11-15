import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { appointmentQueries } from './appointments.queries';
import { paymentsApi, type RegisterPaymentRequest } from './payments.api';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

export type PaymentAction = 'refund' | 'cancel';

type PaymentActionVariables = {
  paymentId: string;
  action: PaymentAction;
  reason: string | null;
};

const refreshAppointment = (queryClient: QueryClient, businessId: string, appointmentId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: appointmentQueries.payments(businessId, appointmentId).queryKey }),
    queryClient.invalidateQueries({ queryKey: appointmentQueries.detail(businessId, appointmentId).queryKey }),
    queryClient.invalidateQueries({ queryKey: appointmentQueries.lists(businessId) }),
  ]);

export const useRegisterPayment = (businessId: string, appointmentId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: RegisterPaymentRequest) => paymentsApi.register(businessId, appointmentId, body),
    onSuccess: () => refreshAppointment(queryClient, businessId, appointmentId),
    onError,
  });
};

export const usePaymentAction = (businessId: string, appointmentId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentId, action, reason }: PaymentActionVariables) =>
      action === 'refund'
        ? paymentsApi.refund(businessId, appointmentId, paymentId, reason)
        : paymentsApi.cancel(businessId, appointmentId, paymentId, reason),
    onSuccess: () => refreshAppointment(queryClient, businessId, appointmentId),
    onError,
  });
};
