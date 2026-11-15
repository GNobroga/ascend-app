import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@packages/ui/components/alert-dialog';
import { Button } from '@packages/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@packages/ui/components/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useCreateSpecialty, useRemoveSpecialty, useUpdateSpecialty } from '../api/professionals.mutations';
import { professionalQueries } from '../api/professionals.queries';
import { specialtySchema, type SpecialtyValues } from '../schemas';
import type { Specialty } from '../types';

type View = { kind: 'list' } | { kind: 'form'; specialty?: Specialty };

type SpecialtiesDialogProps = {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SpecialtiesDialog({ businessId, open, onOpenChange }: SpecialtiesDialogProps) {
  const [view, setView] = useState<View>({ kind: 'list' });

  const handleOpenChange = (next: boolean) => {
    if (!next) setView({ kind: 'list' });
    onOpenChange(next);
  };

  const backToList = () => setView({ kind: 'list' });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        {view.kind === 'list' ? (
          <SpecialtiesList
            businessId={businessId}
            onCreate={() => setView({ kind: 'form' })}
            onEdit={(specialty) => setView({ kind: 'form', specialty })}
            onClose={() => handleOpenChange(false)}
          />
        ) : (
          <SpecialtyForm
            key={view.specialty?.id ?? 'new'}
            businessId={businessId}
            specialty={view.specialty}
            onDone={backToList}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type SpecialtiesListProps = {
  businessId: string;
  onCreate: () => void;
  onEdit: (specialty: Specialty) => void;
  onClose: () => void;
};

function SpecialtiesList({ businessId, onCreate, onEdit, onClose }: SpecialtiesListProps) {
  const { data: specialties } = useSuspenseQuery(professionalQueries.specialties(businessId));
  const [removing, setRemoving] = useState<Specialty | null>(null);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Especialidades</DialogTitle>
        <DialogDescription>
          Destacam no que cada profissional é bom, como “Barba” ou “Coloração”. Valem para toda a equipe.
        </DialogDescription>
      </DialogHeader>

      {specialties.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma especialidade criada ainda.</p>
      ) : (
        <ul className="-mx-2 flex max-h-80 flex-col overflow-y-auto">
          {specialties.map((specialty) => (
            <li key={specialty.id} className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-accent/50">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{specialty.name}</span>
                {specialty.description && (
                  <span className="truncate text-sm text-muted-foreground">{specialty.description}</span>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Editar ${specialty.name}`}
                onClick={() => onEdit(specialty)}
              >
                <PencilIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Excluir ${specialty.name}`}
                onClick={() => setRemoving(specialty)}
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
        <Button type="button" onClick={onCreate}>
          <PlusIcon />
          Nova especialidade
        </Button>
      </DialogFooter>

      <RemoveSpecialtyDialog
        businessId={businessId}
        specialty={removing}
        onOpenChange={(open) => !open && setRemoving(null)}
      />
    </>
  );
}

type SpecialtyFormProps = {
  businessId: string;
  specialty?: Specialty;
  onDone: () => void;
};

function SpecialtyForm({ businessId, specialty, onDone }: SpecialtyFormProps) {
  const form = useForm<SpecialtyValues>({
    resolver: zodResolver(specialtySchema),
    defaultValues: { name: specialty?.name ?? '', description: specialty?.description ?? '' },
  });
  const { errors } = useFormState({ control: form.control });
  const handleError = (error: Error) => applyApiErrors(form, error);
  const createSpecialty = useCreateSpecialty(businessId, { onError: handleError });
  const updateSpecialty = useUpdateSpecialty(businessId, { onError: handleError });
  const isPending = createSpecialty.isPending || updateSpecialty.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const body = { ...values, description: values.description || null };
    if (specialty) {
      updateSpecialty.mutate(
        { specialtyId: specialty.id, body },
        {
          onSuccess: () => {
            toast.success('Especialidade atualizada.');
            onDone();
          },
        },
      );
      return;
    }
    createSpecialty.mutate(body, {
      onSuccess: () => {
        toast.success('Especialidade criada.');
        onDone();
      },
    });
  });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
      <DialogHeader>
        <DialogTitle>{specialty ? 'Editar especialidade' : 'Nova especialidade'}</DialogTitle>
        <DialogDescription>
          {specialty
            ? 'A mudança aparece em todos os profissionais com esta especialidade.'
            : 'Depois de criar, marque no perfil de quem tem esta especialidade.'}
        </DialogDescription>
      </DialogHeader>

      <FieldGroup>
        {serverError && (
          <Alert variant="destructive">
            <CircleAlertIcon />
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="specialty-name">Nome</FieldLabel>
              <Input
                {...field}
                id="specialty-name"
                placeholder="Ex.: Barba"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="specialty-description">
                Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Input
                {...field}
                id="specialty-description"
                placeholder="Ex.: Modelagem e acabamento com navalha"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onDone}>
          Voltar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {specialty ? 'Salvar alterações' : 'Criar especialidade'}
        </Button>
      </DialogFooter>
    </form>
  );
}

type RemoveSpecialtyDialogProps = {
  businessId: string;
  specialty: Specialty | null;
  onOpenChange: (open: boolean) => void;
};

function RemoveSpecialtyDialog({ businessId, specialty, onOpenChange }: RemoveSpecialtyDialogProps) {
  const removeSpecialty = useRemoveSpecialty(businessId);

  const confirm = () => {
    if (!specialty) return;
    removeSpecialty.mutate(specialty.id, {
      onSuccess: () => {
        toast.success('Especialidade excluída.');
        onOpenChange(false);
      },
    });
  };

  return (
    <AlertDialog open={specialty !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir “{specialty?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Os profissionais que têm esta especialidade deixam de ter. Isso não pode ser desfeito.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removeSpecialty.isPending}>Cancelar</AlertDialogCancel>
          <Button type="button" variant="destructive" disabled={removeSpecialty.isPending} onClick={confirm}>
            {removeSpecialty.isPending && <Spinner />}
            Excluir especialidade
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
