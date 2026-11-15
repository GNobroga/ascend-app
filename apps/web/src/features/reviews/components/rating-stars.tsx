import { cn } from '@packages/ui/lib/utils';
import { StarIcon } from 'lucide-react';

const MAX_RATING = 5;

type RatingStarsProps = {
  rating: number;
  className?: string;
};

export function RatingStars({ rating, className }: RatingStarsProps) {
  const rounded = Math.round(rating);

  return (
    <span className={cn('flex items-center gap-0.5', className)}>
      <span className="sr-only">
        Nota {rating} de {MAX_RATING}
      </span>
      {Array.from({ length: MAX_RATING }, (_, index) => (
        <StarIcon
          key={index}
          aria-hidden
          className={cn('size-4', index < rounded ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40')}
        />
      ))}
    </span>
  );
}
