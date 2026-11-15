import { TZDate } from '@date-fns/tz';
import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, EyeIcon, EyeOffIcon, MessageSquareReplyIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { Link } from 'react-router';
import { appointmentsPath } from '@/features/appointments';
import { useRemoveReviewReply, useSetReviewStatus } from '../api/reviews.mutations';
import { ReviewStatus, type Review } from '../types';
import { RatingStars } from './rating-stars';

type ReviewCardProps = {
  businessId: string;
  review: Review;
  timeZone: string;
  canManage: boolean;
  onReply: (review: Review) => void;
};

const formatDate = (value: string, timeZone: string) =>
  format(new TZDate(value, timeZone), "d 'de' MMM 'de' yyyy", { locale: ptBR });

export function ReviewCard({ businessId, review, timeZone, canManage, onReply }: ReviewCardProps) {
  const setStatus = useSetReviewStatus(businessId);
  const removeReply = useRemoveReviewReply(businessId);
  const isHidden = review.status === ReviewStatus.HIDDEN;

  const toggleVisibility = () =>
    setStatus.mutate(
      { reviewId: review.id, status: isHidden ? ReviewStatus.PUBLISHED : ReviewStatus.HIDDEN },
      {
        onSuccess: () =>
          toast.success(isHidden ? 'Comentário visível na página pública.' : 'Comentário oculto da página pública.'),
      },
    );

  const deleteReply = () =>
    removeReply.mutate(review.id, { onSuccess: () => toast.success('Resposta removida.') });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <RatingStars rating={review.rating} />
            <p className="text-sm">
              <span className="font-medium">{review.customer.name}</span>
              {review.professional && (
                <span className="text-muted-foreground"> · atendido por {review.professional.name}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isHidden && (
              <Badge variant="secondary">
                <EyeOffIcon />
                Comentário oculto
              </Badge>
            )}
            <time dateTime={review.createdAt} className="text-sm text-muted-foreground">
              {formatDate(review.createdAt, timeZone)}
            </time>
          </div>
        </div>

        {review.comment ? (
          <p className="text-sm whitespace-pre-line">{review.comment}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">Avaliou sem comentário.</p>
        )}

        {review.reply && (
          <div className="flex flex-col gap-1 rounded-xl bg-muted px-4 py-3">
            <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Resposta do negócio</span>
              {review.repliedAt && formatDate(review.repliedAt, timeZone)}
            </p>
            <p className="text-sm whitespace-pre-line">{review.reply}</p>
          </div>
        )}

        <div className="-mx-2 flex flex-wrap items-center gap-1">
          {canManage && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onReply(review)}>
              {review.reply ? <PencilIcon /> : <MessageSquareReplyIcon />}
              {review.reply ? 'Editar resposta' : 'Responder'}
            </Button>
          )}
          {canManage && review.reply && (
            <Button type="button" variant="ghost" size="sm" disabled={removeReply.isPending} onClick={deleteReply}>
              {removeReply.isPending ? <Spinner /> : <Trash2Icon />}
              Remover resposta
            </Button>
          )}
          {canManage && review.comment && (
            <Button type="button" variant="ghost" size="sm" disabled={setStatus.isPending} onClick={toggleVisibility}>
              {setStatus.isPending && <Spinner />}
              {!setStatus.isPending && (isHidden ? <EyeIcon /> : <EyeOffIcon />)}
              {isHidden ? 'Mostrar comentário' : 'Ocultar comentário'}
            </Button>
          )}
          {review.appointmentId && (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link to={`${appointmentsPath(businessId)}?${new URLSearchParams({ appointment: review.appointmentId })}`} />}
            >
              <CalendarIcon />
              Ver agendamento
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
