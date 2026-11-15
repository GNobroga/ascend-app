import { useMutation, useQueryClient } from '@tanstack/react-query';
import { myAppointmentsApi } from './my-appointments.api';
import { myAppointmentQueries } from './my-appointments.queries';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

const useInvalidateMyAppointments = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: myAppointmentQueries.all() });
};

export const useCreateMyAppointment = ({ onError }: MutationCallbacks = {}) => {
  const invalidate = useInvalidateMyAppointments();

  return useMutation({
    mutationFn: myAppointmentsApi.create,
    onSuccess: invalidate,
    onError,
  });
};

export const useCancelMyAppointment = ({ onError }: MutationCallbacks = {}) => {
  const invalidate = useInvalidateMyAppointments();

  return useMutation({
    mutationFn: myAppointmentsApi.cancel,
    onSettled: invalidate,
    onError,
  });
};

export const useReviewMyAppointment = ({ onError }: MutationCallbacks = {}) => {
  const invalidate = useInvalidateMyAppointments();

  return useMutation({
    mutationFn: myAppointmentsApi.review,
    onSettled: invalidate,
    onError,
  });
};
