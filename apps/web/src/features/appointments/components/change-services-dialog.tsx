import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Checkbox } from '@packages/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@packages/ui/components/dialog';
import { Field, FieldDescription, FieldLabel } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useQuery } from '@tanstack/react-query';
import { CircleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { catalogQueries } from '@/features/catalog';
import type { Professional } from '@/features/professionals';
import { isApiError } from '@/shared/api/api-error';
import { formatCurrency } from '@/shared/lib/format-currency';
import { useSetAppointmentServices } from '../api/appointments.mutations';
import type { Appointment } from '../types';

const MAX_SERVICES = 10;

type ServiceOption = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
};

type ChangeServicesDialogProps = {
  businessId: string;
  appointment: Appointment;
  professional: Professional | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChangeServicesDialog({
  businessId,
  appointment,
  professional,
  open,
  onOpenChange,
}: ChangeServicesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trocar serviços</DialogTitle>
          <DialogDescription>
            O início continua às mesmas horas. Os serviços que ficam mantêm o preço da reserva; os novos usam o preço
            atual.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ChangeServicesForm
            businessId={businessId}
            appointment={appointment}
            professional={professional}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type ChangeServicesFormProps = {
  businessId: string;
  appointment: Appointment;
  professional: Professional | undefined;
  onDone: () => void;
};

function ChangeServicesForm({ businessId, appointment, professional, onDone }: ChangeServicesFormProps) {
  const [selectedIds, setSelectedIds] = useState(() => appointment.services.map(({ serviceId }) => serviceId));
  const [error, setError] = useState<string | null>(null);
  const { data: services = [] } = useQuery(catalogQueries.services(businessId));
  const setServices = useSetAppointmentServices(businessId, {
    onError: (cause) => setError(isApiError(cause) ? cause.message : 'Não foi possível trocar os serviços.'),
  });

  const booked: ServiceOption[] = appointment.services.map((line) => ({
    id: line.serviceId,
    name: line.name,
    durationMinutes: line.durationMinutes,
    price: line.price,
  }));
  const available: ServiceOption[] = services
    .filter(
      (service) =>
        service.isActive &&
        !booked.some(({ id }) => id === service.id) &&
        (professional?.services.some(({ serviceId }) => serviceId === service.id) ?? false),
    )
    .map((service) => ({
      id: service.id,
      name: service.name,
      durationMinutes: service.durationInMinutes,
      price: service.price,
    }));
  const options = [...booked, ...available];
  const selected = selectedIds.map((id) => options.find((option) => option.id === id)).filter((option) => option !== undefined);
  const duration = selected.reduce((sum, option) => sum + option.durationMinutes, 0);
  const total = selected.reduce((sum, option) => sum + option.price, 0);
  const unchanged =
    selectedIds.length === booked.length && selectedIds.every((id, index) => booked[index]?.id === id);

  const toggle = (id: string, checked: boolean) =>
    setSelectedIds((current) => (checked ? [...current, id] : current.filter((candidate) => candidate !== id)));

  const save = () => {
    setError(null);
    setServices.mutate(
      { appointmentId: appointment.id, serviceIds: selectedIds },
      {
        onSuccess: () => {
          toast.success('Serviços atualizados.');
          onDone();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ul className="flex max-h-72 flex-col divide-y overflow-y-auto rounded-2xl border">
        {options.map((option) => {
          const id = `change-service-${option.id}`;
          const checked = selectedIds.includes(option.id);
          return (
            <li key={option.id}>
              <Field orientation="horizontal" className="px-3 py-2">
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={(checked && selectedIds.length === 1) || (!checked && selectedIds.length >= MAX_SERVICES)}
                  onCheckedChange={(next) => toggle(option.id, next)}
                />
                <FieldLabel htmlFor={id} className="min-w-0 flex-1 justify-between font-normal">
                  <span className="truncate">{option.name}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {option.durationMinutes} min · {formatCurrency(option.price)}
                  </span>
                </FieldLabel>
              </Field>
            </li>
          );
        })}
      </ul>
      <FieldDescription>
        Só aparecem os serviços que {appointment.professional.name} executa. Aumentar o atendimento exige horário livre
        depois dele.
      </FieldDescription>

      <DialogFooter className="items-center sm:justify-between">
        <span className="text-sm text-muted-foreground tabular-nums">
          {duration} min · {formatCurrency(total)}
        </span>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" disabled={setServices.isPending} onClick={onDone}>
            Cancelar
          </Button>
          <Button type="button" disabled={setServices.isPending || unchanged} onClick={save}>
            {setServices.isPending && <Spinner />}
            Salvar serviços
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}
