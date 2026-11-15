import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
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
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useSetReviewReply } from '../api/reviews.mutations';
import { REPLY_MAX_LENGTH, reviewReplySchema, type ReviewReplyValues } from '../schemas';
import type { Review } from '../types';

type ReviewReplyDialogProps = {
  businessId: string;
  review: Review | null;
  onOpenChange: (open: boolean) => void;
};

export function ReviewReplyDialog({ businessId, review, onOpenChange }: ReviewReplyDialogProps) {
  return (
    <Dialog open={review !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{review?.reply ? 'Editar resposta' : 'Responder avaliação'}</DialogTitle>
          <DialogDescription>
            A resposta aparece abaixo da avaliação na página pública, mesmo com o comentário oculto.
          </DialogDescription>
        </DialogHeader>
        {review && (
          <ReviewReplyForm
            key={review.id}
            businessId={businessId}
            review={review}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type ReviewReplyFormProps = {
  businessId: string;
  review: Review;
  onDone: () => void;
};

function ReviewReplyForm({ businessId, review, onDone }: ReviewReplyFormProps) {
  const setReply = useSetReviewReply(businessId);
  const form = useForm<ReviewReplyValues>({
    resolver: zodResolver(reviewReplySchema),
    defaultValues: { reply: review.reply ?? '' },
  });
  const serverError = form.formState.errors.root?.server?.message;

  const submit = form.handleSubmit(({ reply }) =>
    setReply.mutate(
      { reviewId: review.id, reply },
      {
        onSuccess: () => {
          toast.success(review.reply ? 'Resposta atualizada.' : 'Resposta publicada.');
          onDone();
        },
        onError: (error) => applyApiErrors(form, error),
      },
    ),
  );

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-6">
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        {review.comment && (
          <blockquote className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{review.customer.name}:</span> {review.comment}
          </blockquote>
        )}

        <Controller
          control={form.control}
          name="reply"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="review-reply">Resposta</FieldLabel>
              <Textarea
                {...field}
                id="review-reply"
                rows={5}
                maxLength={REPLY_MAX_LENGTH}
                placeholder={`Ex.: Obrigado, ${review.customer.name.split(' ')[0]}! Te esperamos de volta.`}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>Seja cordial: qualquer pessoa que visitar a página vai ler.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={setReply.isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={setReply.isPending}>
          {setReply.isPending && <Spinner />}
          Publicar resposta
        </Button>
      </DialogFooter>
    </form>
  );
}
