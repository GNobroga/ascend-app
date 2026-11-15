import { useSuspenseQuery } from '@tanstack/react-query';
import { businessQueries, canManageBusiness } from '@/features/businesses';
import { professionalQueries } from '@/features/professionals';
import { userQueries } from '@/features/users';
import type { Appointment } from '../types';

export const useAppointmentScope = (businessId: string) => {
  const { data: user } = useSuspenseQuery(userQueries.me());
  const { data: businesses } = useSuspenseQuery(businessQueries.mine());
  const { data: members } = useSuspenseQuery(businessQueries.members(businessId));
  const { data: professionals } = useSuspenseQuery(professionalQueries.list(businessId));

  const canManage = canManageBusiness(businesses.find(({ id }) => id === businessId)?.roles ?? []);
  const viewerProfessionalId = members.find(({ userId }) => userId === user.id)?.professionalId ?? null;

  return {
    canManage,
    viewerProfessionalId,
    professionals: canManage ? professionals : professionals.filter(({ id }) => id === viewerProfessionalId),
    canActOn: (appointment: Appointment) => canManage || appointment.professional.id === viewerProfessionalId,
  };
};
