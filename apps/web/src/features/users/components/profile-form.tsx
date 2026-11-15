import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@packages/ui/components/avatar';
import { Button } from '@packages/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { SaveBar, SaveBarActions, SaveBarMessage } from '@packages/ui/components/save-bar';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon, ImageMinusIcon, ImageUpIcon } from 'lucide-react';
import { useRef, type ChangeEvent } from 'react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { ACCEPTED_IMAGE_TYPES, imageFileError, MAX_IMAGE_SIZE_MB } from '@/shared/lib/image-file';
import { initialsOf } from '@/shared/lib/initials';
import { formatPhone, formatStoredPhone, onlyDigits } from '@/shared/lib/masks';
import { useRemoveProfilePhoto, useSetProfilePhoto, useUpdateProfile } from '../api/users.mutations';
import { userQueries } from '../api/users.queries';
import { profileSchema, type ProfileValues } from '../schemas';
import type { User } from '../types';

const toFormValues = (user: User): ProfileValues => ({
  name: user.name,
  phone: user.phone ? formatStoredPhone(user.phone) : '',
});

export function ProfileForm() {
  const { data: user } = useSuspenseQuery(userQueries.me());
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: toFormValues(user),
  });
  const { errors, isDirty } = useFormState({ control: form.control });
  const updateProfile = useUpdateProfile({ onError: (error) => applyApiErrors(form, error) });

  const onSubmit = form.handleSubmit((values) => {
    updateProfile.mutate(
      { name: values.name, phone: values.phone ? onlyDigits(values.phone) : null },
      {
        onSuccess: (saved) => {
          form.reset(toFormValues(saved));
          toast.success('Perfil salvo.');
        },
      },
    );
  });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit}>
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <ProfilePhotoField user={user} />

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="profile-name">Nome</FieldLabel>
              <Input {...field} id="profile-name" autoComplete="name" aria-invalid={fieldState.invalid} />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="profile-phone">
                Telefone <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Input
                {...field}
                id="profile-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(11) 99999-0000"
                className="sm:max-w-xs"
                aria-invalid={fieldState.invalid}
                onChange={(event) => field.onChange(formatPhone(event.target.value))}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      {isDirty && (
        <SaveBar aria-label="Alterações não salvas">
          <SaveBarMessage>Você tem alterações não salvas.</SaveBarMessage>
          <SaveBarActions>
            <Button type="button" variant="ghost" disabled={updateProfile.isPending} onClick={() => form.reset()}>
              Descartar
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending && <Spinner />}
              Salvar perfil
            </Button>
          </SaveBarActions>
        </SaveBar>
      )}
    </form>
  );
}

type ProfilePhotoFieldProps = {
  user: User;
};

function ProfilePhotoField({ user }: ProfilePhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setPhoto = useSetProfilePhoto();
  const removePhoto = useRemoveProfilePhoto();
  const isSaving = setPhoto.isPending || removePhoto.isPending;

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const error = imageFileError(file);
    if (error) {
      toast.error(error);
      return;
    }
    setPhoto.mutate(file, { onSuccess: () => toast.success('Foto atualizada.') });
  };

  return (
    <Field>
      <FieldLabel>Foto</FieldLabel>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-16">
            {user.photoUrl && <AvatarImage src={user.photoUrl} alt="" />}
            <AvatarFallback className="text-lg font-medium">{initialsOf(user.name)}</AvatarFallback>
          </Avatar>
          {isSaving && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Spinner />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => inputRef.current?.click()}>
            <ImageUpIcon />
            {user.photoUrl ? 'Trocar foto' : 'Enviar foto'}
          </Button>
          {user.photoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => removePhoto.mutate(undefined, { onSuccess: () => toast.success('Foto removida.') })}
            >
              <ImageMinusIcon />
              Remover
            </Button>
          )}
        </div>
      </div>
      <FieldDescription>Aparece para a equipe e os clientes. Quadrada, até {MAX_IMAGE_SIZE_MB} MB.</FieldDescription>
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} hidden onChange={handleFile} />
    </Field>
  );
}
