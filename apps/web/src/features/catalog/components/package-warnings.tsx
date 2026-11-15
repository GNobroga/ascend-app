import { Badge } from '@packages/ui/components/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@packages/ui/components/tooltip';
import { TriangleAlertIcon } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { businessPath } from '@/features/businesses';
import type { Package } from '../types';
import { useCanManageCatalog } from '../use-can-manage-catalog';

type PackageWarningsProps = {
  item: Package;
};

export function PackageWarnings({ item }: PackageWarningsProps) {
  const hasInactiveService = item.services.some((service) => !service.isActive);
  const hasNoProfessionals = item.professionals.length === 0;

  return (
    <>
      {hasNoProfessionals && <NoProfessionalsWarning />}
      {hasInactiveService && (
        <PackageWarning
          label="Serviço inativo"
          description="Um dos serviços está inativo, então o pacote não aparece na sua página."
        />
      )}
    </>
  );
}

export function NoProfessionalsWarning() {
  const { businessId = '' } = useParams();
  const canManage = useCanManageCatalog(businessId);

  return canManage ? (
    <PackageWarning
      label="Sem profissionais"
      description="Sem profissionais ligados, o pacote não pode ser agendado. Clique para escolher quem atende."
      to={`${businessPath(businessId)}/professionals`}
    />
  ) : (
    <PackageWarning
      label="Sem profissionais"
      description="Sem profissionais ligados, o pacote não pode ser agendado."
    />
  );
}

type PackageWarningProps = {
  label: string;
  description: string;
  to?: string;
};

export function PackageWarning({ label, description, to }: PackageWarningProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          to ? (
            <Badge variant="outline" render={<Link to={to} />} />
          ) : (
            <Badge variant="outline" className="cursor-help" />
          )
        }
      >
        <TriangleAlertIcon />
        {label}
      </TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}
