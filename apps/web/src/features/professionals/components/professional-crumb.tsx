import { useQuery } from '@tanstack/react-query';
import { professionalQueries } from '../api/professionals.queries';

type ProfessionalCrumbProps = {
  businessId: string;
  professionalId: string;
};

export function ProfessionalCrumb({ businessId, professionalId }: ProfessionalCrumbProps) {
  const { data: professional } = useQuery(professionalQueries.detail(businessId, professionalId));
  return professional?.displayName ?? 'Profissional';
}
