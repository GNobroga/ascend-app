import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent } from '@packages/ui/components/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { SaveBar, SaveBarActions, SaveBarMessage } from '@packages/ui/components/save-bar';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Textarea } from '@packages/ui/components/textarea';
import { ToggleGroup, ToggleGroupItem } from '@packages/ui/components/toggle-group';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon, ImageMinusIcon, ImageUpIcon, Settings2Icon } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { ACCEPTED_IMAGE_TYPES, imageFileError, MAX_IMAGE_SIZE_MB } from '@/shared/lib/image-file';
import {
  useRemoveProfessionalPhoto,
  useSetProfessionalPhoto,
  useUpdateProfessional,
} from '../api/professionals.mutations';
import { professionalQueries } from '../api/professionals.queries';
import { professionalProfileSchema, type ProfessionalProfileValues } from '../schemas';
import type { Professional } from '../types';
import { CommissionInput } from './commission-input';
import { ProfessionalAvatar } from './professional-avatar';
import { SpecialtiesDialog } from './specialties-dialog';

const toFormValues = (professional: Professional): ProfessionalProfileValues => ({
  displayName: professional.displayName,
  bio: professional.bio ?? '',
  commissionPercent: professional.commissionPercent,
  specialtyIds: professional.specialties.map(({ id }) => id),
});

const haveSameIds = (left: string[], right: string[]) =>
  left.length === right.length && left.every((id) => right.includes(id));

type ProfessionalProfileFormProps = {
  businessId: string;
  professional: Professional;
};

export function ProfessionalProfileForm({ businessId, professional }: ProfessionalProfileFormProps) {
  const form = useForm<ProfessionalProfileValues>({
    resolver: zodResolver(professionalProfileSchema),
    defaultValues: toFormValues(professional),
  });
  const { errors, isDirty } = useFormState({ control: form.control });
  const updateProfessional = useUpdateProfessional(businessId, professional.id, {
    onError: (error) => applyApiErrors(form, error),
  });

  const { data: specialties } = useSuspenseQuery(professionalQueries.specialties(businessId));
  const [isSpecialtiesOpen, setIsSpecialtiesOpen] = useState(false);

  const onSubmit = form.handleSubmit(({ specialtyIds, ...values }) => {
    const existingIds = specialtyIds.filter((id) => specialties.some((specialty) => specialty.id === id));
    const currentIds = professional.specialties.map(({ id }) => id);
    updateProfessional.mutate(
      {
        profile: { ...values, bio: values.bio || null },
        specialtyIds: haveSameIds(existingIds, currentIds) ? undefined : existingIds,
      },
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
    <>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        <Card>
          <CardContent>
            <FieldGroup>
              {serverError && (
                <Alert variant="destructive">
                  <CircleAlertIcon />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <ProfessionalPhotoField businessId={businessId} professional={professional} />

              <Controller
                control={form.control}
                name="displayName"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="profile-display-name">Nome de exibição</FieldLabel>
                    <Input
                      {...field}
                      id="profile-display-name"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      className="sm:max-w-sm"
                    />
                    <FieldDescription>É o nome que os clientes veem ao agendar.</FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="bio"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="profile-bio">
                      Apresentação <span className="font-normal text-muted-foreground">(opcional)</span>
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="profile-bio"
                      rows={3}
                      placeholder="Ex.: Barbeira há 10 anos, especialista em degradê."
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="specialtyIds"
                render={({ field }) => (
                  <Field>
                    <div className="flex items-center justify-between gap-2">
                      <FieldLabel id="profile-specialties-label">
                        Especialidades <span className="font-normal text-muted-foreground">(opcional)</span>
                      </FieldLabel>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setIsSpecialtiesOpen(true)}>
                        <Settings2Icon />
                        Gerenciar
                      </Button>
                    </div>
                    {specialties.length > 0 ? (
                      <ToggleGroup
                        multiple
                        variant="outline"
                        aria-labelledby="profile-specialties-label"
                        className="flex-wrap"
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        {specialties.map((specialty) => (
                          <ToggleGroupItem key={specialty.id} value={specialty.id}>
                            {specialty.name}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    ) : (
                      <FieldDescription>
                        Nenhuma especialidade criada. Use “Gerenciar” para criar, como “Barba” ou “Coloração”.
                      </FieldDescription>
                    )}
                    {specialties.length > 0 && (
                      <FieldDescription>Aparecem para os clientes ao escolher o profissional.</FieldDescription>
                    )}
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="commissionPercent"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="profile-commission">Comissão padrão</FieldLabel>
                    <CommissionInput
                      id="profile-commission"
                      ref={field.ref}
                      name={field.name}
                      onBlur={field.onBlur}
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                      groupClassName="sm:w-40"
                    />
                    <FieldDescription>
                      Vale para os serviços e pacotes sem comissão própria. Não muda agendamentos já feitos.
                    </FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {isDirty && (
          <SaveBar aria-label="Alterações não salvas">
            <SaveBarMessage>Você tem alterações não salvas.</SaveBarMessage>
            <SaveBarActions>
              <Button
                type="button"
                variant="ghost"
                disabled={updateProfessional.isPending}
                onClick={() => form.reset()}
              >
                Descartar
              </Button>
              <Button type="submit" disabled={updateProfessional.isPending}>
                {updateProfessional.isPending && <Spinner />}
                Salvar perfil
              </Button>
            </SaveBarActions>
          </SaveBar>
        )}
      </form>

      <SpecialtiesDialog businessId={businessId} open={isSpecialtiesOpen} onOpenChange={setIsSpecialtiesOpen} />
    </>
  );
}

type ProfessionalPhotoFieldProps = {
  businessId: string;
  professional: Professional;
};

function ProfessionalPhotoField({ businessId, professional }: ProfessionalPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const setPhoto = useSetProfessionalPhoto(businessId, professional.id);
  const removePhoto = useRemoveProfessionalPhoto(businessId, professional.id);
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
          <ProfessionalAvatar professional={professional} className="size-16 text-lg" />
          {isSaving && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
              <Spinner />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isSaving} onClick={() => inputRef.current?.click()}>
            <ImageUpIcon />
            {professional.photoUrl ? 'Trocar foto' : 'Enviar foto'}
          </Button>
          {professional.photoUrl && (
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
      <FieldDescription>Aparece para os clientes ao escolher o profissional. Até {MAX_IMAGE_SIZE_MB} MB.</FieldDescription>
      <input ref={inputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} hidden onChange={handleFile} />
    </Field>
  );
}
