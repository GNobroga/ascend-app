import { Badge } from '@packages/ui/components/badge';
import { ClockIcon } from 'lucide-react';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import { packageDiscount } from '../package-pricing';
import type { Package } from '../types';
import { CatalogCard } from './catalog-card';
import { PackageActionsMenu, type PackageActions } from './package-actions-menu';
import { NoProfessionalsWarning } from './package-warnings';

const packageHiddenReason = (item: Package) => {
  if (!item.isActive) return 'O pacote está inativo, então não aparece na sua página.';
  if (item.services.some((service) => !service.isActive))
    return 'Um dos serviços está inativo, então o pacote não aparece na sua página.';
  return null;
};

type PackagesGridProps = {
  packages: Package[];
  actions: PackageActions | null;
  onView: (item: Package) => void;
};

export function PackagesGrid({ packages, actions, onView }: PackagesGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {packages.map((item) => {
        const discount = packageDiscount(item.price, item.servicesPrice);

        return (
          <CatalogCard
            key={item.id}
            name={item.name}
            imageUrl={item.coverImageUrl}
            subtitle={item.services.map((service) => service.name).join(' + ')}
            hiddenReason={packageHiddenReason(item)}
            onViewPhotos={() => onView(item)}
            onAddPhotos={actions ? () => actions.onEditPhotos(item) : undefined}
            onNameClick={actions ? () => actions.onEdit(item) : undefined}
            actionsMenu={actions && <PackageActionsMenu item={item} actions={actions} />}
            badges={
              (discount || item.professionals.length === 0) && (
                <>
                  {discount && <Badge>−{discount.percent}%</Badge>}
                  {item.professionals.length === 0 && (
                    <NoProfessionalsWarning />
                  )}
                </>
              )
            }
            footer={
              <>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ClockIcon className="size-4" />
                  {formatMinutes(item.durationMinutes)}
                </span>
                <span className="flex flex-col items-end">
                  {discount && (
                    <span className="text-xs text-muted-foreground tabular-nums line-through">
                      {formatCurrency(item.servicesPrice)}
                    </span>
                  )}
                  <span className="text-base font-semibold tabular-nums">{formatCurrency(item.price)}</span>
                </span>
              </>
            }
          />
        );
      })}
    </div>
  );
}
