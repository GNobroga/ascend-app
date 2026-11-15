import { Button } from '@packages/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { EllipsisIcon, EyeIcon, EyeOffIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import type { Package } from '../types';

export type PackageActions = {
  onEdit: (item: Package) => void;
  onEditPhotos: (item: Package) => void;
  onToggleActive: (item: Package) => void;
  onDelete: (item: Package) => void;
};

type PackageActionsMenuProps = {
  item: Package;
  actions: PackageActions;
};

export function PackageActionsMenu({ item, actions }: PackageActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações de ${item.name}`} />}
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem onClick={() => actions.onEdit(item)}>
          <PencilIcon />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.onToggleActive(item)}>
          {item.isActive ? <EyeOffIcon /> : <EyeIcon />}
          {item.isActive ? 'Inativar' : 'Ativar'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => actions.onDelete(item)}>
          <Trash2Icon />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
