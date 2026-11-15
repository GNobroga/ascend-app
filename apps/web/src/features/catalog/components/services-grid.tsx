import { Badge } from '@packages/ui/components/badge';
import { ClockIcon } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import type { Service, ServiceGroup } from '../types';
import { CatalogCard } from './catalog-card';
import { ServiceActionsMenu, type ServiceActions } from './service-actions-menu';

const serviceHiddenReason = (service: Service, group: ServiceGroup) => {
  if (!service.isActive) return 'O serviço está inativo, então não aparece na sua página.';
  if (!group.isActive) return 'A categoria está inativa, então seus serviços não aparecem na sua página.';
  return null;
};

type ServicesGridProps = {
  groups: ServiceGroup[];
  actions: ServiceActions | null;
  onView: (service: Service) => void;
};

export function ServicesGrid({ groups, actions, onView }: ServicesGridProps) {
  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.id} aria-label={group.name} className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-medium">
            {group.name}
            <span className="text-sm font-normal text-muted-foreground">{group.services.length}</span>
            {!group.isActive && <Badge variant="outline">Categoria inativa</Badge>}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {group.services.map((service) => (
              <CatalogCard
                key={service.id}
                name={service.name}
                imageUrl={service.coverImageUrl}
                subtitle={service.description}
                hiddenReason={serviceHiddenReason(service, group)}
                onViewPhotos={() => onView(service)}
                onAddPhotos={actions ? () => actions.onEditPhotos(service) : undefined}
                onNameClick={actions ? () => actions.onEdit(service) : undefined}
                actionsMenu={actions && <ServiceActionsMenu service={service} actions={actions} />}
                footer={
                  <>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ClockIcon className="size-4" />
                      {formatMinutes(service.durationInMinutes)}
                    </span>
                    <span className="text-base font-semibold tabular-nums">{formatCurrency(service.price)}</span>
                  </>
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
