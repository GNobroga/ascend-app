import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { cn } from '@packages/ui/lib/utils';
import { CalendarPlusIcon, CalendarXIcon, MessageSquareQuoteIcon, StarIcon } from 'lucide-react';
import { Link } from 'react-router';
import { AppointmentStatus, STATUS_DOT_CLASSES } from '@/features/appointments';
import { BusinessAvatar } from '@/features/businesses';
import { RatingStars } from '@/features/reviews';
import { formatCurrency } from '@/shared/lib/format-currency';
import {
  CUSTOMER_STATUS_LABELS,
  formatAppointmentDay,
  formatDeadline,
  formatTime,
  isOpen,
  whatWasBooked,
} from '../format';
import type { MyAppointment } from '../types';

type MyAppointmentCardProps = {
  appointment: MyAppointment;
  highlighted: boolean;
  onCancel: (appointment: MyAppointment) => void;
  onReview: (appointment: MyAppointment) => void;
};

const scrollIntoView = (element: HTMLElement | null) => element?.scrollIntoView({ block: 'center' });

export function MyAppointmentCard({ appointment, highlighted, onCancel, onReview }: MyAppointmentCardProps) {
  const { business, review } = appointment;
  const timeZone = business.timezone;
  const isCancelled = appointment.status === AppointmentStatus.CANCELLED;
  const isFinished = !isOpen(appointment) && appointment.status !== AppointmentStatus.IN_PROGRESS;

  return (
    <Card ref={highlighted ? scrollIntoView : undefined} className={cn(highlighted && 'ring-2 ring-primary')}>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Link to={`/${business.slug}`} className="flex min-w-0 items-center gap-3 hover:underline">
            <BusinessAvatar business={business} className="size-10" />
            <span className="truncate font-medium">{business.name}</span>
          </Link>
          <Badge variant="outline" className="gap-1.5">
            <span aria-hidden className={cn('size-2 rounded-full', STATUS_DOT_CLASSES[appointment.status])} />
            {CUSTOMER_STATUS_LABELS[appointment.status]}
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <p className={cn('font-medium first-letter:uppercase', isCancelled && 'text-muted-foreground line-through')}>
            {formatAppointmentDay(appointment.startAt, timeZone)}
          </p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatTime(appointment.startAt, timeZone)}–{formatTime(appointment.endAt, timeZone)} ·{' '}
            {whatWasBooked(appointment)} com {appointment.professional.name} ·{' '}
            {formatCurrency(appointment.totalPrice)}
          </p>
        </div>

        {appointment.customerNotes && (
          <p className="text-sm">
            <span className="text-muted-foreground">Sua observação: </span>
            {appointment.customerNotes}
          </p>
        )}

        {isCancelled && appointment.cancellationReason && (
          <p className="text-sm">
            <span className="text-muted-foreground">Motivo do cancelamento: </span>
            {appointment.cancellationReason}
          </p>
        )}

        {review && (
          <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3">
            <RatingStars rating={review.rating} />
            {review.comment && <p className="text-sm">{review.comment}</p>}
            {review.reply && (
              <p className="flex gap-2 text-sm text-muted-foreground">
                <MessageSquareQuoteIcon className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">Resposta de {business.name}: </span>
                  {review.reply}
                </span>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {isOpen(appointment) &&
            (appointment.cancellableUntil ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => onCancel(appointment)}>
                  <CalendarXIcon />
                  Cancelar
                </Button>
                <span className="text-xs text-muted-foreground">
                  Cancelamento online até {formatDeadline(appointment.cancellableUntil, timeZone)}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                O prazo para cancelar online acabou. Se precisar, fale com {business.name}.
              </span>
            ))}

          {appointment.reviewableUntil && (
            <>
              <Button
                type="button"
                variant={review ? 'outline' : 'default'}
                size="sm"
                onClick={() => onReview(appointment)}
              >
                <StarIcon />
                {review ? 'Editar avaliação' : 'Avaliar atendimento'}
              </Button>
              <span className="text-xs text-muted-foreground">
                Até {formatDeadline(appointment.reviewableUntil, timeZone)}
              </span>
            </>
          )}

          {isFinished && (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link to={`/${business.slug}/book`} />}
            >
              <CalendarPlusIcon />
              Agendar de novo
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
