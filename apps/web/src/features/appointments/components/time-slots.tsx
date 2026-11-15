import { Button } from '@packages/ui/components/button';
import { FieldDescription } from '@packages/ui/components/field';
import { Spinner } from '@packages/ui/components/spinner';

type TimeSlotsProps = {
  isReady: boolean;
  isLoading: boolean;
  slots: string[];
  value: string;
  notReadyMessage: string;
  onSelect: (time: string) => void;
};

export function TimeSlots({ isReady, isLoading, slots, value, notReadyMessage, onSelect }: TimeSlotsProps) {
  if (!isReady) return <FieldDescription>{notReadyMessage}</FieldDescription>;
  if (isLoading) return <Spinner className="text-muted-foreground" />;
  if (slots.length === 0) {
    return <FieldDescription>Nenhum horário livre neste dia. Tente outro dia ou informe um encaixe.</FieldDescription>;
  }

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {slots.map((slot) => (
        <Button
          key={slot}
          type="button"
          size="sm"
          variant={slot === value ? 'default' : 'outline'}
          aria-pressed={slot === value}
          className="tabular-nums"
          onClick={() => onSelect(slot)}
        >
          {slot}
        </Button>
      ))}
    </div>
  );
}
