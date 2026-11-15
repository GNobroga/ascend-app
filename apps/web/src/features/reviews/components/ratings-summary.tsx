import { Card, CardContent, CardHeader, CardTitle } from '@packages/ui/components/card';
import { useQuery } from '@tanstack/react-query';
import type { Professional } from '@/features/professionals';
import { reviewQueries } from '../api/reviews.queries';
import { RatingStars } from './rating-stars';

type RatingsSummaryProps = {
  businessId: string;
  slug: string;
  professionals: Professional[];
};

const formatAverage = (average: number) => average.toLocaleString('pt-BR', { minimumFractionDigits: 1 });

export function RatingsSummary({ businessId, slug, professionals }: RatingsSummaryProps) {
  const { data } = useQuery(reviewQueries.ratings(businessId, slug));
  if (!data || data.business.average === null) return null;

  const names = new Map(professionals.map(({ id, displayName }) => [id, displayName]));
  const byProfessional = data.professionals
    .filter(({ professionalId }) => names.has(professionalId))
    .toSorted((a, b) => (b.average ?? 0) - (a.average ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nota do negócio</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span className="text-4xl font-semibold tabular-nums">{formatAverage(data.business.average)}</span>
          <span className="flex flex-col gap-1">
            <RatingStars rating={data.business.average} />
            <span className="text-sm text-muted-foreground">
              {data.business.count} {data.business.count === 1 ? 'avaliação' : 'avaliações'}
            </span>
          </span>
        </div>

        {byProfessional.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase">Por profissional</h3>
            <ul className="flex flex-col gap-2">
              {byProfessional.map(({ professionalId, average, count }) => (
                <li key={professionalId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{names.get(professionalId)}</span>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    <span className="font-medium text-foreground">{average !== null && formatAverage(average)}</span> ·{' '}
                    {count}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
