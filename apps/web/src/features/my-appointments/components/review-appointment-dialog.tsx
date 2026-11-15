import { Button } from '@packages/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@packages/ui/components/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { useState } from 'react';
import { useReviewMyAppointment } from '../api/my-appointments.mutations';
import { formatDeadline } from '../format';
import type { MyAppointment } from '../types';
import { RatingInput } from './rating-input';

const COMMENT_MAX_LENGTH = 2000;

type ReviewAppointmentDialogProps = {
  appointment: MyAppointment | null;
  onOpenChange: (open: boolean) => void;
};

export function ReviewAppointmentDialog({ appointment, onOpenChange }: ReviewAppointmentDialogProps) {
  return (
    <Dialog open={appointment !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {appointment && (
          <ReviewForm key={appointment.id} appointment={appointment} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

type ReviewFormProps = {
  appointment: MyAppointment;
  onDone: () => void;
};

function ReviewForm({ appointment, onDone }: ReviewFormProps) {
  const [rating, setRating] = useState(appointment.review?.rating ?? 0);
  const [comment, setComment] = useState(appointment.review?.comment ?? '');
  const [ratingError, setRatingError] = useState(false);
  const review = useReviewMyAppointment();
  const isEditing = appointment.review !== null;

  const submit = () => {
    if (rating === 0) {
      setRatingError(true);
      return;
    }
    review.mutate(
      { appointmentId: appointment.id, rating, comment: comment.trim() || null },
      {
        onSuccess: () => {
          toast.success(isEditing ? 'Avaliação atualizada.' : 'Obrigado pela avaliação!');
          onDone();
        },
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? 'Editar avaliação' : `Como foi em ${appointment.business.name}?`}</DialogTitle>
        <DialogDescription>
          Atendimento com {appointment.professional.name}. Sua nota conta para o negócio e para o profissional.
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        <Field data-invalid={ratingError}>
          <FieldLabel id="review-rating">Nota</FieldLabel>
          <RatingInput
            name="review-rating"
            labelId="review-rating"
            value={rating}
            invalid={ratingError}
            onChange={(next) => {
              setRating(next);
              setRatingError(false);
            }}
          />
          {ratingError && <FieldError>Escolha uma nota de 1 a 5.</FieldError>}
        </Field>

        <Field>
          <FieldLabel htmlFor="review-comment">
            Comentário <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Textarea
            id="review-comment"
            rows={4}
            maxLength={COMMENT_MAX_LENGTH}
            value={comment}
            placeholder="Conte como foi o atendimento."
            onChange={(event) => setComment(event.target.value)}
          />
          {appointment.reviewableUntil && (
            <FieldDescription>
              Aparece na página do negócio. Você pode editar até{' '}
              {formatDeadline(appointment.reviewableUntil, appointment.business.timezone)}.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={review.isPending} onClick={onDone}>
          Voltar
        </Button>
        <Button type="button" disabled={review.isPending} onClick={submit}>
          {review.isPending && <Spinner />}
          {isEditing ? 'Salvar avaliação' : 'Enviar avaliação'}
        </Button>
      </DialogFooter>
    </>
  );
}
