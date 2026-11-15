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
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { Switch } from '@packages/ui/components/switch';
import { Textarea } from '@packages/ui/components/textarea';
import { CircleAlertIcon } from 'lucide-react';
import { Controller, useForm, useFormState } from 'react-hook-form';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { useCreateCategory, useUpdateCategory } from '../api/catalog.mutations';
import { categorySchema, type CategoryValues } from '../schemas';
import type { ServiceCategory } from '../types';

const toFormValues = (category?: ServiceCategory): CategoryValues => ({
  name: category?.name ?? '',
  description: category?.description ?? '',
  isActive: category?.isActive ?? true,
});

type CategoryFormDialogProps = {
  businessId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ServiceCategory;
};

export function CategoryFormDialog({ businessId, open, onOpenChange, category }: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          <DialogDescription>Categorias organizam os serviços no catálogo e na sua página.</DialogDescription>
        </DialogHeader>
        {open && (
          <CategoryForm
            key={category?.id ?? 'new'}
            businessId={businessId}
            category={category}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

type CategoryFormProps = {
  businessId: string;
  category?: ServiceCategory;
  onDone: () => void;
};

function CategoryForm({ businessId, category, onDone }: CategoryFormProps) {
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: toFormValues(category),
  });
  const { errors } = useFormState({ control: form.control });
  const handleError = (error: Error) => applyApiErrors(form, error);
  const createCategory = useCreateCategory(businessId, { onError: handleError });
  const updateCategory = useUpdateCategory(businessId, { onError: handleError });
  const isPending = createCategory.isPending || updateCategory.isPending;

  const onSubmit = form.handleSubmit((values) => {
    const body = { ...values, description: values.description || null };
    if (category) {
      updateCategory.mutate(
        { categoryId: category.id, body },
        {
          onSuccess: () => {
            toast.success('Categoria atualizada.');
            onDone();
          },
        },
      );
      return;
    }
    createCategory.mutate(body, {
      onSuccess: () => {
        toast.success('Categoria criada.');
        onDone();
      },
    });
  });

  const serverError = errors.root?.server?.message;

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
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
              <FieldLabel htmlFor="category-name">Nome</FieldLabel>
              <Input
                {...field}
                id="category-name"
                placeholder="Ex.: Cabelo"
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
              <FieldLabel htmlFor="category-description">
                Descrição <span className="font-normal text-muted-foreground">(opcional)</span>
              </FieldLabel>
              <Textarea
                {...field}
                id="category-description"
                rows={2}
                placeholder="Ex.: Cortes, escova e coloração"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="category-active">Visível na sua página</FieldLabel>
                <FieldDescription>Desligada, a categoria e os serviços dela somem da página pública.</FieldDescription>
              </FieldContent>
              <Switch id="category-active" checked={field.value} onCheckedChange={field.onChange} />
            </Field>
          )}
        />
      </FieldGroup>

      <DialogFooter>
        <Button type="button" variant="ghost" disabled={isPending} onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          {category ? 'Salvar alterações' : 'Criar categoria'}
        </Button>
      </DialogFooter>
    </form>
  );
}
