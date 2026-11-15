import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@packages/ui/components/alert-dialog';
import { Button } from '@packages/ui/components/button';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useBusinessTimezone } from '@/features/businesses';
import { useRemoveTimeOff } from '../api/professionals.mutations';
import { formatTimeOffPeriod, TIME_OFF_TYPE_LABELS } from '../time-offs';
import type { ProfessionalTimeOff } from '../types';

type RemoveTimeOffDialogProps = {
  businessId: string;
  professionalId: string;
  timeOff: ProfessionalTimeOff | null;
  onOpenChange: (open: boolean) => void;
};

export function RemoveTimeOffDialog({ businessId, professionalId, timeOff, onOpenChange }: RemoveTimeOffDialogProps) {
  const removeTimeOff = useRemoveTimeOff(businessId, professionalId);
  const timeZone = useBusinessTimezone(businessId);

  const confirm = () => {
    if (!timeOff) return;
    removeTimeOff.mutate(timeOff.id, {
      onSuccess: () => {
        toast.success('Ausência excluída.');
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={timeOff !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir ausência?</AlertDialogTitle>
          <AlertDialogDescription>
            {timeOff && `${TIME_OFF_TYPE_LABELS[timeOff.type]}, ${formatTimeOffPeriod(timeOff, timeZone)}. `}
            Os horários voltam a aparecer na agenda.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeTimeOff.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={removeTimeOff.isPending} onClick={confirm}>
            {removeTimeOff.isPending && <Spinner />}
            Excluir ausência
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
