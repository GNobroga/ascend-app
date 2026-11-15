import { Button } from '@packages/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { EllipsisIcon, EyeIcon, EyeOffIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import type { Service } from '../types';

export type ServiceActions = {
  onEdit: (service: Service) => void;
  onEditPhotos: (service: Service) => void;
  onToggleActive: (service: Service) => void;
  onDelete: (service: Service) => void;
};

type ServiceActionsMenuProps = {
  service: Service;
  actions: ServiceActions;
};

export function ServiceActionsMenu({ service, actions }: ServiceActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações de ${service.name}`} />}
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => actions.onEdit(service)}>
          <PencilIcon />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onToggleActive(service)}>
          {service.isActive ? <EyeOffIcon /> : <EyeIcon />}
          {service.isActive ? 'Inativar' : 'Ativar'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(service)}>
          <Trash2Icon />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
