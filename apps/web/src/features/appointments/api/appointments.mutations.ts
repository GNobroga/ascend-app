import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customerQueries } from '@/features/customers';
import { subscriptionQueries } from '@/features/subscriptions';
import type { Appointment } from '../types';
import {
  appointmentsApi,
  type ChangeAppointmentStatusRequest,
  type CreateAppointmentRequest,
  type UpdateAppointmentRequest,
} from './appointments.api';
import { appointmentQueries } from './appointments.queries';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

export const useCreateAppointment = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateAppointmentRequest) => appointmentsApi.create(businessId, body),
    onSuccess: (appointment) => {
      queryClient.setQueryData(appointmentQueries.detail(businessId, appointment.id).queryKey, appointment);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: appointmentQueries.lists(businessId) }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueries.byBusiness(businessId).queryKey }),
      ]);
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: [...appointmentQueries.all(businessId), 'availability'] });
      onError?.(error);
    },
  });
};

type ChangeStatusVariables = ChangeAppointmentStatusRequest & {
  appointmentId: string;
};

export const useChangeAppointmentStatus = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, ...body }: ChangeStatusVariables) =>
      appointmentsApi.changeStatus(businessId, appointmentId, body),
    onSuccess: (appointment) => {
      queryClient.setQueryData(appointmentQueries.detail(businessId, appointment.id).queryKey, (current) => ({
        ...appointment,
        history: appointment.history ?? current?.history,
      }));
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: appointmentQueries.detail(businessId, appointment.id).queryKey }),
        queryClient.invalidateQueries({ queryKey: appointmentQueries.lists(businessId) }),
        queryClient.invalidateQueries({ queryKey: customerQueries.detail(businessId, appointment.customer.id).queryKey }),
      ]);
    },
  });
};

type UpdateAppointmentVariables = UpdateAppointmentRequest & {
  appointmentId: string;
  preview?: Pick<Appointment, 'startAt' | 'endAt' | 'professional'>;
};

export const useUpdateAppointment = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, startAt, professionalId, internalNotes }: UpdateAppointmentVariables) =>
      appointmentsApi.update(businessId, appointmentId, { startAt, professionalId, internalNotes }),
    onMutate: async ({ appointmentId, preview }) => {
      if (!preview) return;
      await queryClient.cancelQueries({ queryKey: appointmentQueries.lists(businessId) });
      queryClient.setQueriesData<Appointment[]>({ queryKey: appointmentQueries.lists(businessId) }, (appointments) =>
        appointments?.map((appointment) => (appointment.id === appointmentId ? { ...appointment, ...preview } : appointment)),
      );
    },
    onSuccess: (appointment) => {
      queryClient.setQueryData(appointmentQueries.detail(businessId, appointment.id).queryKey, (current) => ({
        ...appointment,
        history: appointment.history ?? current?.history,
      }));
    },
    onError,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: appointmentQueries.lists(businessId) }),
        queryClient.invalidateQueries({ queryKey: [...appointmentQueries.all(businessId), 'availability'] }),
      ]),
  });
};

type SetServicesVariables = {
  appointmentId: string;
  serviceIds: string[];
};

export const useSetAppointmentServices = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ appointmentId, serviceIds }: SetServicesVariables) =>
      appointmentsApi.setServices(businessId, appointmentId, serviceIds),
    onSuccess: (appointment) => {
      queryClient.setQueryData(appointmentQueries.detail(businessId, appointment.id).queryKey, (current) => ({
        ...appointment,
        history: appointment.history ?? current?.history,
      }));
      return queryClient.invalidateQueries({ queryKey: appointmentQueries.lists(businessId) });
    },
    onError,
  });
};
