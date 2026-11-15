import { cn } from '@packages/ui/lib/utils';
import { StarIcon } from 'lucide-react';

const RATINGS = [1, 2, 3, 4, 5] as const;

const RATING_LABELS: Record<(typeof RATINGS)[number], string> = {
  1: 'Péssimo',
  2: 'Ruim',
  3: 'Regular',
  4: 'Bom',
  5: 'Excelente',
};

type RatingInputProps = {
  name: string;
  labelId: string;
  value: number;
  invalid?: boolean;
  onChange: (rating: number) => void;
};

export function RatingInput({ name, labelId, value, invalid, onChange }: RatingInputProps) {
  const selected = RATINGS.find((rating) => rating === value);

  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-labelledby={labelId} aria-invalid={invalid} className="flex items-center gap-1">
        {RATINGS.map((rating) => (
          <label
            key={rating}
            className="cursor-pointer rounded-md p-0.5 has-focus-visible:ring-3 has-focus-visible:ring-ring/30"
          >
            <input
              type="radio"
              name={name}
              value={rating}
              checked={rating === value}
              className="sr-only"
              onChange={() => onChange(rating)}
            />
            <span className="sr-only">
              {rating} {rating === 1 ? 'estrela' : 'estrelas'}: {RATING_LABELS[rating]}
            </span>
            <StarIcon
              aria-hidden
              className={cn(
                'size-7 transition-colors',
                rating <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40 hover:text-amber-400',
              )}
            />
          </label>
        ))}
      </div>
      {selected && <span className="text-sm text-muted-foreground">{RATING_LABELS[selected]}</span>}
    </div>
  );
}
