import { TZDate } from '@date-fns/tz';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Spinner } from '@packages/ui/components/spinner';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MessageSquareQuoteIcon } from 'lucide-react';
import { RatingStars } from '@/features/reviews';
import { storefrontQueries } from '../api/storefront.queries';
import { formatAverage, pluralize } from '../format';
import type { PublicBusiness } from '../types';
import { StorefrontSection } from './storefront-section';

type ReviewsSectionProps = {
  business: PublicBusiness;
};

export function ReviewsSection({ business }: ReviewsSectionProps) {
  const { data: ratings } = useQuery(storefrontQueries.ratings(business.slug));
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery(
    storefrontQueries.reviews(business.slug),
  );
  const reviews = (data?.pages ?? []).flatMap((page) => page.data);
  const average = ratings?.business.average ?? null;

  if (!ratings || average === null) return null;

  return (
    <StorefrontSection
      id="reviews"
      title="Avaliações"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold tabular-nums">{formatAverage(average)}</span>
          <span className="flex flex-col">
            <RatingStars rating={average} />
            <span className="text-xs text-muted-foreground">
              {pluralize(ratings.business.count, 'avaliação', 'avaliações')}
            </span>
          </span>
        </div>
      }
    >
      <ul className="flex flex-col gap-3">
        {reviews.map((review) => (
          <li key={review.id}>
            <Card>
              <CardContent className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <RatingStars rating={review.rating} />
                  <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
                    {format(new TZDate(review.createdAt, business.timezone), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </time>
                </div>
                {review.comment && <p className="text-sm">{review.comment}</p>}
                <p className="text-xs text-muted-foreground">
                  {review.customerFirstName}
                  {review.professionalName && ` · atendido por ${review.professionalName}`}
                </p>
                {review.reply && (
                  <p className="flex gap-2 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                    <MessageSquareQuoteIcon className="mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="font-medium text-foreground">Resposta de {business.name}: </span>
                      {review.reply}
                    </span>
                  </p>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <Button
          type="button"
          variant="outline"
          className="self-center"
          disabled={isFetchingNextPage}
          onClick={() => void fetchNextPage()}
        >
          {isFetchingNextPage && <Spinner />}
          Ver mais avaliações
        </Button>
      )}
    </StorefrontSection>
  );
}
