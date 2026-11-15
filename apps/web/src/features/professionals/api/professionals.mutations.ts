import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { businessQueries } from '@/features/businesses';
import { catalogQueries } from '@/features/catalog';
import { subscriptionQueries } from '@/features/subscriptions';
import type { Professional } from '../types';
import {
  professionalsApi,
  type CreateProfessionalRequest,
  type SetProfessionalPackagesRequest,
  type SetProfessionalServicesRequest,
  type SetWorkingHoursRequest,
  type SpecialtyRequest,
  type TimeOffRequest,
  type UpdateProfessionalRequest,
} from './professionals.api';
import { professionalQueries } from './professionals.queries';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

const storeProfessional = (queryClient: QueryClient, businessId: string, professional: Professional) => {
  queryClient.setQueryData(professionalQueries.detail(businessId, professional.id).queryKey, professional);
  queryClient.setQueryData(professionalQueries.list(businessId).queryKey, (professionals: Professional[] = []) =>
    professionals.map((item) => (item.id === professional.id ? professional : item)),
  );
};

const invalidateDependents = (queryClient: QueryClient, businessId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: catalogQueries.packages(businessId).queryKey }),
    queryClient.invalidateQueries({ queryKey: subscriptionQueries.byBusiness(businessId).queryKey }),
  ]);

export const useCreateProfessional = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateProfessionalRequest) => professionalsApi.create(businessId, body),
    onSuccess: (professional) => {
      queryClient.setQueryData(professionalQueries.detail(businessId, professional.id).queryKey, professional);
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: professionalQueries.list(businessId).queryKey }),
        queryClient.invalidateQueries({ queryKey: businessQueries.members(businessId).queryKey }),
        queryClient.invalidateQueries({ queryKey: subscriptionQueries.byBusiness(businessId).queryKey }),
      ]);
    },
    onError,
  });
};

type UpdateProfessionalVariables = {
  profile: UpdateProfessionalRequest;
  specialtyIds?: string[];
};

export const useUpdateProfessional = (
  businessId: string,
  professionalId: string,
  { onError }: MutationCallbacks = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ profile, specialtyIds }: UpdateProfessionalVariables) => {
      const professional = await professionalsApi.update(businessId, professionalId, profile);
      if (!specialtyIds) return professional;
      return professionalsApi.setSpecialties(businessId, professionalId, { specialtyIds });
    },
    onSuccess: (professional) => {
      storeProfessional(queryClient, businessId, professional);
      return queryClient.invalidateQueries({ queryKey: catalogQueries.packages(businessId).queryKey });
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: professionalQueries.detail(businessId, professionalId).queryKey });
      onError?.(error);
    },
  });
};

export const useRemoveProfessional = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (professionalId: string) => professionalsApi.remove(businessId, professionalId),
    onSuccess: (_result, professionalId) => {
      queryClient.setQueryData(professionalQueries.list(businessId).queryKey, (professionals: Professional[] = []) =>
        professionals.filter((item) => item.id !== professionalId),
      );
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: businessQueries.members(businessId).queryKey }),
        invalidateDependents(queryClient, businessId),
      ]);
    },
  });
};

export const useSetProfessionalPhoto = (businessId: string, professionalId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => professionalsApi.setPhoto(businessId, professionalId, file),
    onSuccess: (professional) => storeProfessional(queryClient, businessId, professional),
  });
};

export const useRemoveProfessionalPhoto = (businessId: string, professionalId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => professionalsApi.removePhoto(businessId, professionalId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: professionalQueries.all(businessId) }),
  });
};

type SetAssignmentsVariables = SetProfessionalServicesRequest & SetProfessionalPackagesRequest;

export const useSetProfessionalAssignments = (
  businessId: string,
  professionalId: string,
  { onError }: MutationCallbacks = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ services, packages }: SetAssignmentsVariables) => {
      await professionalsApi.setServices(businessId, professionalId, { services });
      return professionalsApi.setPackages(businessId, professionalId, { packages });
    },
    onSuccess: (professional) => {
      storeProfessional(queryClient, businessId, professional);
      return invalidateDependents(queryClient, businessId);
    },
    onError: (error) => {
      void queryClient.invalidateQueries({ queryKey: professionalQueries.detail(businessId, professionalId).queryKey });
      onError?.(error);
    },
  });
};

export const useSetWorkingHours = (businessId: string, professionalId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SetWorkingHoursRequest) => professionalsApi.setWorkingHours(businessId, professionalId, body),
    onSuccess: (hours) => {
      queryClient.setQueryData(professionalQueries.workingHours(businessId, professionalId).queryKey, hours);
      return queryClient.invalidateQueries({ queryKey: subscriptionQueries.byBusiness(businessId).queryKey });
    },
    onError,
  });
};

type UpdateTimeOffVariables = {
  timeOffId: string;
  body: TimeOffRequest;
};

const invalidateTimeOffs = (queryClient: QueryClient, businessId: string, professionalId: string) =>
  queryClient.invalidateQueries({ queryKey: professionalQueries.timeOffs(businessId, professionalId).queryKey });

export const useCreateTimeOff = (businessId: string, professionalId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: TimeOffRequest) => professionalsApi.createTimeOff(businessId, professionalId, body),
    onSuccess: () => invalidateTimeOffs(queryClient, businessId, professionalId),
    onError,
  });
};

export const useUpdateTimeOff = (businessId: string, professionalId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timeOffId, body }: UpdateTimeOffVariables) =>
      professionalsApi.updateTimeOff(businessId, professionalId, timeOffId, body),
    onSuccess: () => invalidateTimeOffs(queryClient, businessId, professionalId),
    onError,
  });
};

export const useRemoveTimeOff = (businessId: string, professionalId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timeOffId: string) => professionalsApi.removeTimeOff(businessId, professionalId, timeOffId),
    onSuccess: () => invalidateTimeOffs(queryClient, businessId, professionalId),
  });
};

type UpdateSpecialtyVariables = {
  specialtyId: string;
  body: SpecialtyRequest;
};

export const useCreateSpecialty = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SpecialtyRequest) => professionalsApi.createSpecialty(businessId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: professionalQueries.specialties(businessId).queryKey }),
    onError,
  });
};

export const useUpdateSpecialty = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ specialtyId, body }: UpdateSpecialtyVariables) =>
      professionalsApi.updateSpecialty(businessId, specialtyId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: professionalQueries.all(businessId) }),
    onError,
  });
};

export const useRemoveSpecialty = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (specialtyId: string) => professionalsApi.removeSpecialty(businessId, specialtyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: professionalQueries.all(businessId) }),
  });
};
