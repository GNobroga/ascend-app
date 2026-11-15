import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@packages/ui/components/dropdown-menu';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CalendarOffIcon, ChevronDownIcon, EllipsisIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { useBusinessTimezone } from '@/features/businesses';
import { professionalQueries } from '../api/professionals.queries';
import { formatTimeOffPeriod, isTimeOffOngoing, isTimeOffPast, TIME_OFF_TYPE_LABELS } from '../time-offs';
import type { ProfessionalTimeOff } from '../types';
import { RemoveTimeOffDialog } from './remove-time-off-dialog';
import { TimeOffFormDialog } from './time-off-form-dialog';

type ProfessionalTimeOffsProps = {
  businessId: string;
  professionalId: string;
};

export function ProfessionalTimeOffs({ businessId, professionalId }: ProfessionalTimeOffsProps) {
  const { data: timeOffs, dataUpdatedAt } = useSuspenseQuery(professionalQueries.timeOffs(businessId, professionalId));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProfessionalTimeOff>();
  const [removing, setRemoving] = useState<ProfessionalTimeOff | null>(null);
  const [showPast, setShowPast] = useState(false);
  const timeZone = useBusinessTimezone(businessId);

  const now = new Date(dataUpdatedAt);
  const upcoming = timeOffs.filter((timeOff) => !isTimeOffPast(timeOff, now));
  const past = timeOffs.filter((timeOff) => isTimeOffPast(timeOff, now)).toReversed();

  const openForm = (timeOff?: ProfessionalTimeOff) => {
    setEditing(timeOff);
    setIsFormOpen(true);
  };

  const newTimeOffButton = (
    <Button type="button" onClick={() => openForm()}>
      <PlusIcon />
      Nova ausência
    </Button>
  );

  const renderItem = (timeOff: ProfessionalTimeOff) => (
    <TimeOffItem
      key={timeOff.id}
      timeOff={timeOff}
      timeZone={timeZone}
      isOngoing={isTimeOffOngoing(timeOff, now)}
      onEdit={() => openForm(timeOff)}
      onRemove={() => setRemoving(timeOff)}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Férias, folgas e consultas. Nesses períodos, a agenda não oferece horários com este profissional.
        </p>
        {timeOffs.length > 0 && newTimeOffButton}
      </div>

      {timeOffs.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarOffIcon />
            </EmptyMedia>
            <EmptyTitle>Nenhuma ausência registrada</EmptyTitle>
            <EmptyDescription>
              Registre férias ou compromissos para que ninguém agende com este profissional nesses dias.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newTimeOffButton}</EmptyContent>
        </Empty>
      ) : (
        <>
          {upcoming.length > 0 ? (
            <Card className="py-0">
              <CardContent className="px-0">
                <ul className="flex flex-col divide-y">{upcoming.map(renderItem)}</ul>
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma ausência programada.</p>
          )}

          {past.length > 0 && (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start"
                aria-expanded={showPast}
                onClick={() => setShowPast((value) => !value)}
              >
                <ChevronDownIcon className={showPast ? 'rotate-180' : undefined} />
                {showPast ? 'Ocultar anteriores' : `Ver anteriores (${past.length})`}
              </Button>
              {showPast && (
                <Card className="py-0">
                  <CardContent className="px-0">
                    <ul className="flex flex-col divide-y">{past.map(renderItem)}</ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      <TimeOffFormDialog
        businessId={businessId}
        professionalId={professionalId}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        timeOff={editing}
      />
      <RemoveTimeOffDialog
        businessId={businessId}
        professionalId={professionalId}
        timeOff={removing}
        onOpenChange={(open) => !open && setRemoving(null)}
      />
    </div>
  );
}

type TimeOffItemProps = {
  timeOff: ProfessionalTimeOff;
  timeZone: string;
  isOngoing: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

function TimeOffItem({ timeOff, timeZone, isOngoing, onEdit, onRemove }: TimeOffItemProps) {
  const label = TIME_OFF_TYPE_LABELS[timeOff.type];

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          {isOngoing && <Badge variant="secondary">Em andamento</Badge>}
        </div>
        <span className="text-sm text-muted-foreground">{formatTimeOffPeriod(timeOff, timeZone)}</span>
        {timeOff.reason && <span className="text-sm wrap-break-word text-muted-foreground">{timeOff.reason}</span>}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações da ausência: ${label}`} />}
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onRemove}>
            <Trash2Icon />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
