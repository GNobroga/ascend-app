import { Button } from '@packages/ui/components/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@packages/ui/components/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import { ListSkeleton } from '@packages/ui/components/skeletons';
import { Spinner } from '@packages/ui/components/spinner';
import { cn } from '@packages/ui/lib/utils';
import { useInfiniteQuery, useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { FilterXIcon, StarIcon } from 'lucide-react';
import { useQueryStates } from 'nuqs';
import { useState } from 'react';
import { useParams } from 'react-router';
import { businessQueries, canManageBusiness, useBusinessTimezone } from '@/features/businesses';
import { professionalQueries } from '@/features/professionals';
import { PageContainer } from '@/shared/components/page-container';
import { PageHeader } from '@/shared/components/page-header';
import { reviewQueries } from '../api/reviews.queries';
import { RatingsSummary } from '../components/ratings-summary';
import { ReviewCard } from '../components/review-card';
import { ReviewReplyDialog } from '../components/review-reply-dialog';
import { RATINGS, reviewListSearchParams } from '../search-params';
import { ReviewStatus, type Review } from '../types';

const ALL = 'all';

const STATUS_LABELS: Record<ReviewStatus, string> = {
  [ReviewStatus.PUBLISHED]: 'Comentário visível',
  [ReviewStatus.HIDDEN]: 'Comentário oculto',
};

const ratingItems = [
  { value: ALL, label: 'Todas as notas' },
  ...RATINGS.map((rating) => ({ value: String(rating), label: `${rating} ${rating === 1 ? 'estrela' : 'estrelas'}` })),
];

const statusItems = [
  { value: ALL, label: 'Todas' },
  ...Object.values(ReviewStatus).map((status) => ({ value: status, label: STATUS_LABELS[status] })),
];

const isReviewStatus = (value: string): value is ReviewStatus =>
  Object.values(ReviewStatus).some((status) => status === value);

function ReviewsPage() {
  const { businessId } = useParams();
  if (!businessId) return null;

  return <Reviews businessId={businessId} />;
}

type ReviewsProps = {
  businessId: string;
};

function Reviews({ businessId }: ReviewsProps) {
  const [filters, setFilters] = useQueryStates(reviewListSearchParams);
  const [replying, setReplying] = useState<Review | null>(null);
  const timeZone = useBusinessTimezone(businessId);
  const { data: business } = useSuspenseQuery(businessQueries.detail(businessId));
  const { data: businesses } = useSuspenseQuery(businessQueries.mine());
  const { data: professionals = [] } = useQuery(professionalQueries.list(businessId));
  const { data, isPending, isPlaceholderData, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery(
    reviewQueries.list(businessId, filters),
  );

  const roles = businesses.find(({ id }) => id === businessId)?.roles ?? [];
  const canManage = canManageBusiness(roles);
  const reviews = (data?.pages ?? []).flatMap((page) => page.data);
  const hasFilters = filters.rating !== null || filters.status !== null || filters.professional !== null;
  const professionalItems = [
    { value: ALL, label: 'Todos os profissionais' },
    ...professionals.map(({ id, displayName }) => ({ value: id, label: displayName })),
  ];

  return (
    <PageContainer>
      <PageHeader title="Avaliações" description="O que os clientes acharam do atendimento." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={ratingItems}
              value={filters.rating === null ? ALL : String(filters.rating)}
              onValueChange={(value) => void setFilters({ rating: value && value !== ALL ? Number(value) : null })}
            >
              <SelectTrigger aria-label="Filtrar por nota" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ratingItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              items={statusItems}
              value={filters.status ?? ALL}
              onValueChange={(value) => void setFilters({ status: value && isReviewStatus(value) ? value : null })}
            >
              <SelectTrigger aria-label="Filtrar por visibilidade do comentário" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {professionals.length > 1 && (
              <Select
                items={professionalItems}
                value={filters.professional ?? ALL}
                onValueChange={(value) => void setFilters({ professional: value && value !== ALL ? value : null })}
              >
                <SelectTrigger aria-label="Filtrar por profissional" className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {professionalItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void setFilters({ rating: null, status: null, professional: null })}
              >
                <FilterXIcon />
                Limpar filtros
              </Button>
            )}

            {isPlaceholderData && <Spinner className="text-muted-foreground" />}
          </div>

          {isPending && <ListSkeleton rows={3} />}

          {!isPending && reviews.length === 0 && (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <StarIcon />
                </EmptyMedia>
                <EmptyTitle>{hasFilters ? 'Nenhuma avaliação com esses filtros' : 'Nenhuma avaliação ainda'}</EmptyTitle>
                <EmptyDescription>
                  {hasFilters
                    ? 'Tente outra nota ou limpe os filtros.'
                    : 'Depois de um atendimento concluído, o cliente com conta recebe o convite para avaliar.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {reviews.length > 0 && (
            <ul className={cn('flex flex-col gap-3', isPlaceholderData && 'opacity-60')}>
              {reviews.map((review) => (
                <li key={review.id}>
                  <ReviewCard
                    businessId={businessId}
                    review={review}
                    timeZone={timeZone}
                    canManage={canManage}
                    onReply={setReplying}
                  />
                </li>
              ))}
            </ul>
          )}

          {hasNextPage && (
            <Button
              type="button"
              variant="outline"
              className="self-center"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage && <Spinner />}
              Carregar mais
            </Button>
          )}
        </div>

        <RatingsSummary businessId={businessId} slug={business.slug} professionals={professionals} />
      </div>

      <ReviewReplyDialog
        businessId={businessId}
        review={replying}
        onOpenChange={(open) => {
          if (!open) setReplying(null);
        }}
      />
    </PageContainer>
  );
}

export { ReviewsPage as Component };
