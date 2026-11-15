import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CameraIcon, CheckIcon, ChevronsUpDownIcon, ImageMinusIcon, ImageUpIcon, PlusIcon } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { ACCEPTED_IMAGE_TYPES, imageFileError } from '@/shared/lib/image-file';
import { useRemoveBusinessLogo, useSetBusinessLogo } from '../api/businesses.mutations';
import { businessQueries } from '../api/businesses.queries';
import { businessPath, NEW_BUSINESS_PATH } from '../loaders';
import { canManageBusiness, primaryRoleLabel } from '../roles';
import { BusinessAvatar } from './business-avatar';

type BusinessSwitcherProps = {
  businessId: string;
};

export function BusinessSwitcher({ businessId }: BusinessSwitcherProps) {
  const navigate = useNavigate();
  const { data: businesses } = useSuspenseQuery(businessQueries.mine());
  const setLogo = useSetBusinessLogo(businessId);
  const removeLogo = useRemoveBusinessLogo(businessId);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const current = businesses.find(({ id }) => id === businessId);

  if (!current) return null;

  const canManage = canManageBusiness(current.roles);
  const hasLogo = current.logoUrl !== null;
  const isSavingLogo = setLogo.isPending || removeLogo.isPending;

  const handleLogoFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const error = imageFileError(file);
    if (error) {
      toast.error(error);
      return;
    }
    setLogo.mutate(file, { onSuccess: () => toast.success('Logo atualizada.') });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Negócio atual: ${current.name}. Trocar de negócio`}
              className="flex h-10 w-full min-w-0 items-center gap-2 rounded-xl px-1 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring/40 data-popup-open:bg-sidebar-accent"
            />
          }
        >
          <span className="relative shrink-0">
            <BusinessAvatar business={current} className="size-8" />
            {isSavingLogo && (
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
                <Spinner className="size-4" />
              </span>
            )}
            {canManage && !hasLogo && !isSavingLogo && (
              <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border-2 border-sidebar bg-foreground text-background">
                <CameraIcon className="size-2.5" />
              </span>
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col transition-opacity group-data-[state=collapsed]/sidebar:opacity-0">
            <span className="truncate text-sm font-semibold">{current.name}</span>
            <span className="truncate text-xs text-muted-foreground">{primaryRoleLabel(current.roles)}</span>
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground transition-opacity group-data-[state=collapsed]/sidebar:opacity-0" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="min-w-60">
          {canManage && (
            <>
              <DropdownMenuGroup>
                <DropdownMenuLabel>{current.name}</DropdownMenuLabel>
                <DropdownMenuItem disabled={isSavingLogo} onClick={() => logoInputRef.current?.click()}>
                  <ImageUpIcon />
                  {hasLogo ? 'Alterar logo' : 'Adicionar logo'}
                </DropdownMenuItem>
                {hasLogo && (
                  <DropdownMenuItem
                    variant="destructive"
                    disabled={isSavingLogo}
                    onClick={() => removeLogo.mutate(undefined, { onSuccess: () => toast.success('Logo removida.') })}
                  >
                    <ImageMinusIcon />
                    Remover logo
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuGroup>
            <DropdownMenuLabel>Negócios</DropdownMenuLabel>
            {businesses.map((business) => (
              <DropdownMenuItem key={business.id} onClick={() => navigate(businessPath(business.id))}>
                <BusinessAvatar business={business} className="size-6" />
                <span className="flex-1 truncate">{business.name}</span>
                {business.id === businessId && <CheckIcon className="text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate(NEW_BUSINESS_PATH)}>
            <PlusIcon />
            Criar negócio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {canManage && (
        <input
          ref={logoInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          hidden
          onChange={handleLogoFile}
        />
      )}
    </>
  );
}
