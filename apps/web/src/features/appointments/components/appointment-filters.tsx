import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from '@packages/ui/components/avatar';
import { Button } from '@packages/ui/components/button';
import { Calendar } from '@packages/ui/components/calendar';
import { Checkbox } from '@packages/ui/components/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { Field, FieldLabel } from '@packages/ui/components/field';
import { Popover, PopoverContent, PopoverTrigger } from '@packages/ui/components/popover';
import { Spinner } from '@packages/ui/components/spinner';
import { ptBR } from 'date-fns/locale';
import { ChevronDownIcon, SlidersHorizontalIcon } from 'lucide-react';
import { useState } from 'react';
import type { Professional } from '@/features/professionals';
import { initialsOf } from '@/shared/lib/initials';

const MAX_AVATARS = 3;

type DatePickerProps = {
  label: string;
  shortLabel: string;
  selectedDate: Date;
  isFetching: boolean;
  onSelectDate: (date: Date) => void;
};

export function DatePicker({ label, shortLabel, selectedDate, isFetching, onSelectDate }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <h1 className="flex min-w-0 items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              className="min-w-0 shrink px-2 text-lg font-semibold tracking-tight sm:text-xl"
              aria-label={`${label}, escolher data`}
            />
          }
        >
          <span className="truncate first-letter:uppercase">
            <span className="xl:hidden">{shortLabel}</span>
            <span className="max-xl:hidden">{label}</span>
          </span>
          <ChevronDownIcon className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            key={`${selectedDate.getFullYear()}-${selectedDate.getMonth()}`}
            mode="single"
            locale={ptBR}
            selected={selectedDate}
            defaultMonth={selectedDate}
            onSelect={(date) => {
              if (!date) return;
              onSelectDate(date);
              setIsOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {isFetching && <Spinner className="text-muted-foreground" />}
    </h1>
  );
}

type ProfessionalFilterProps = {
  professionals: Professional[];
  selectedIds: string[];
  viewerProfessionalId: string | null;
  onToggle: (professionalId: string) => void;
  onSelectAll: () => void;
  onSelectOnly: (professionalId: string) => void;
};

export function ProfessionalFilter({
  professionals,
  selectedIds,
  viewerProfessionalId,
  onToggle,
  onSelectAll,
  onSelectOnly,
}: ProfessionalFilterProps) {
  const selected = professionals.filter(({ id }) => selectedIds.includes(id));
  const isAll = selected.length === professionals.length;
  const isOnlyViewer = selected.length === 1 && selected[0]?.id === viewerProfessionalId;
  const viewerToSelect =
    !isOnlyViewer && professionals.some(({ id }) => id === viewerProfessionalId) ? viewerProfessionalId : null;

  return (
    <Popover>
      <PopoverTrigger render={<Button type="button" variant="outline" />}>
        <AvatarGroup>
          {selected.slice(0, MAX_AVATARS).map((professional) => (
            <ProfessionalAvatar key={professional.id} professional={professional} />
          ))}
          {selected.length > MAX_AVATARS && <AvatarGroupCount>+{selected.length - MAX_AVATARS}</AvatarGroupCount>}
        </AvatarGroup>
        <span className="max-xl:sr-only">
          {isAll ? 'Todos os profissionais' : `${selected.length} de ${professionals.length} profissionais`}
        </span>
        <ChevronDownIcon className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-2 p-2">
        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          <span className="text-xs font-medium text-muted-foreground uppercase">Profissionais</span>
          <div className="flex items-center gap-1">
            {viewerToSelect && (
              <Button type="button" variant="ghost" size="xs" onClick={() => onSelectOnly(viewerToSelect)}>
                Só eu
              </Button>
            )}
            {!isAll && (
              <Button type="button" variant="ghost" size="xs" onClick={onSelectAll}>
                Todos
              </Button>
            )}
          </div>
        </div>
        <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          {professionals.map((professional) => {
            const id = `appointments-professional-${professional.id}`;
            const isSelected = selectedIds.includes(professional.id);
            return (
              <li key={professional.id}>
                <Field orientation="horizontal" className="rounded-xl px-2 py-1.5 hover:bg-accent/50">
                  <Checkbox
                    id={id}
                    checked={isSelected}
                    disabled={isSelected && selectedIds.length === 1}
                    onCheckedChange={() => onToggle(professional.id)}
                  />
                  <FieldLabel htmlFor={id} className="min-w-0 flex-1 font-normal">
                    <ProfessionalAvatar professional={professional} />
                    <span className="truncate">{professional.displayName}</span>
                  </FieldLabel>
                </Field>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

type ProfessionalAvatarProps = {
  professional: Professional;
};

function ProfessionalAvatar({ professional }: ProfessionalAvatarProps) {
  return (
    <Avatar size="sm">
      {professional.photoUrl && <AvatarImage src={professional.photoUrl} alt="" />}
      <AvatarFallback>{initialsOf(professional.displayName)}</AvatarFallback>
    </Avatar>
  );
}

type AppointmentFiltersMenuProps = {
  showCancelled: boolean;
  onShowCancelledChange: (show: boolean) => void;
};

export function AppointmentFiltersMenu({ showCancelled, onShowCancelledChange }: AppointmentFiltersMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" aria-label={showCancelled ? 'Filtros, 1 ativo' : 'Filtros'} />}
      >
        <SlidersHorizontalIcon />
        <span className="max-xl:sr-only">Filtros</span>
        {showCancelled && <span aria-hidden className="size-1.5 rounded-full bg-primary" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuCheckboxItem checked={showCancelled} onCheckedChange={onShowCancelledChange}>
          Mostrar cancelados
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
