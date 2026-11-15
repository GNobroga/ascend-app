import { Badge } from '@packages/ui/components/badge';
import { Card, CardContent } from '@packages/ui/components/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@packages/ui/components/tooltip';
import { cn } from '@packages/ui/lib/utils';
import { EyeOffIcon, ImageIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type CatalogCardProps = {
  name: string;
  imageUrl: string | null;
  subtitle?: ReactNode;
  badges?: ReactNode;
  footer: ReactNode;
  actionsMenu?: ReactNode;
  hiddenReason: string | null;
  onViewPhotos: () => void;
  onAddPhotos?: () => void;
  onNameClick?: () => void;
};

const COVER_CLASS = 'flex aspect-[3/2] w-full items-center justify-center overflow-hidden bg-muted text-muted-foreground';

export function CatalogCard({
  name,
  imageUrl,
  subtitle,
  badges,
  footer,
  actionsMenu,
  hiddenReason,
  onViewPhotos,
  onAddPhotos,
  onNameClick,
}: CatalogCardProps) {
  const onImageClick = imageUrl ? onViewPhotos : onAddPhotos;

  const cover = imageUrl ? (
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      className={cn('size-full object-cover', hiddenReason && 'opacity-50 grayscale')}
    />
  ) : (
    <ImageIcon className="size-8" />
  );

  return (
    <Card className="pt-0">
      <div className="relative">
        {onImageClick ? (
          <button
            type="button"
            aria-label={imageUrl ? `Ver fotos de ${name}` : `Adicionar fotos a ${name}`}
            className={cn(COVER_CLASS, 'outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:ring-inset')}
            onClick={onImageClick}
          >
            {cover}
          </button>
        ) : (
          <div className={COVER_CLASS}>{cover}</div>
        )}
        {hiddenReason && (
          <Tooltip>
            <TooltipTrigger
              render={<Badge variant="secondary" className="absolute top-3 left-3 cursor-help shadow-sm" />}
            >
              <EyeOffIcon />
              Oculto
            </TooltipTrigger>
            <TooltipContent>{hiddenReason}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {onNameClick ? (
              <button
                type="button"
                className="truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={onNameClick}
              >
                {name}
              </button>
            ) : (
              <span className="truncate font-medium">{name}</span>
            )}
            {subtitle && <span className="line-clamp-2 text-muted-foreground">{subtitle}</span>}
          </div>
          {actionsMenu && <div className="-mt-1 -mr-2 shrink-0">{actionsMenu}</div>}
        </div>
        {badges && <div className="flex flex-wrap gap-2">{badges}</div>}
        <div className="mt-auto flex items-end justify-between gap-4">{footer}</div>
      </CardContent>
    </Card>
  );
}
