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
import { Input } from '@packages/ui/components/input';
import { Spinner } from '@packages/ui/components/spinner';
import { CircleAlertIcon } from 'lucide-react';
import type { FormEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { GalleryImage } from './image-gallery-field';

const altTextSchema = z.object({
  altText: z.string().trim().max(255, 'Use no máximo 255 caracteres.'),
});

type AltTextValues = z.infer<typeof altTextSchema>;

type ImageAltTextDialogProps = {
  image: GalleryImage | null;
  placeholder: string;
  isPending: boolean;
  serverError: string | null;
  onSave: (altText: string | null) => void;
  onOpenChange: (open: boolean) => void;
};

export function ImageAltTextDialog({
  image,
  placeholder,
  isPending,
  serverError,
  onSave,
  onOpenChange,
}: ImageAltTextDialogProps) {
  return (
    <Dialog open={image !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Descrição da foto</DialogTitle>
          <DialogDescription>
            Ajuda quem usa leitor de tela e aparece no lugar da foto se ela não carregar.
          </DialogDescription>
        </DialogHeader>
        {image && (
          <ImageAltTextForm
            key={image.id}
            image={image}
            placeholder={placeholder}
            isPending={isPending}
            serverError={serverError}
            onSave={onSave}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type ImageAltTextFormProps = {
  image: GalleryImage;
  placeholder: string;
  isPending: boolean;
  serverError: string | null;
  onSave: (altText: string | null) => void;
  onCancel: () => void;
};

function ImageAltTextForm({ image, placeholder, isPending, serverError, onSave, onCancel }: ImageAltTextFormProps) {
  const form = useForm<AltTextValues>({
    resolver: zodResolver(altTextSchema),
    defaultValues: { altText: image.altText ?? '' },
  });

  const submit = form.handleSubmit(({ altText }) => onSave(altText || null));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation();
    void submit(event);
  };

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <img src={image.url} alt="" className="aspect-video w-full rounded-xl border bg-muted object-cover" />

        <Controller
          control={form.control}
          name="altText"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="image-alt-text">
                Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Input
                {...field}
                id="image-alt-text"
                placeholder={placeholder}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>Descreva o que aparece na foto em poucas palavras.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          Salvar descrição
        </Button>
      </DialogFooter>
    </form>
  );
}
