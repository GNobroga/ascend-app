import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription } from '@packages/ui/components/alert';
import { Badge } from '@packages/ui/components/badge';
import { Button } from '@packages/ui/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@packages/ui/components/card';
import { Checkbox } from '@packages/ui/components/checkbox';
import { FieldError } from '@packages/ui/components/field';
import { SaveBar, SaveBarActions, SaveBarMessage } from '@packages/ui/components/save-bar';
import { toast } from '@packages/ui/components/sonner';
import { Spinner } from '@packages/ui/components/spinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { CircleAlertIcon, InfoIcon } from 'lucide-react';
import { Controller, useForm, useFormState, useWatch, type Control } from 'react-hook-form';
import { Link } from 'react-router';
import { businessPath } from '@/features/businesses';
import { catalogQueries } from '@/features/catalog';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { applyApiErrors } from '@/shared/forms/apply-api-errors';
import { formatCurrency } from '@/shared/lib/format-currency';
import { formatMinutes } from '@/shared/lib/format-duration';
import { formatPercent } from '@/shared/lib/format-percent';
import { useSetProfessionalAssignments } from '../api/professionals.mutations';
import { assignmentsSchema, type AssignmentsValues } from '../schemas';
import type { Professional } from '../types';
import { CommissionInput } from './commission-input';

type CatalogOption = {
  id: string;
  name: string;
  isActive: boolean;
  durationInMinutes: number;
  price: number;
  usesOwnCommission: boolean;
};

type AssignedLink = {
  commissionPercent: number | null;
};

const toAssignment = (id: string, link: AssignedLink | undefined) => ({
  id,
  selected: link !== undefined,
  commissionPercent: link?.commissionPercent ?? Number.NaN,
});

const toFormValues = (
  professional: Professional,
  services: CatalogOption[],
  packages: CatalogOption[],
): AssignmentsValues => ({
  services: services.map(({ id }) => toAssignment(id, professional.services.find(({ serviceId }) => serviceId === id))),
  packages: packages.map(({ id }) => toAssignment(id, professional.packages.find(({ packageId }) => packageId === id))),
});

const toCommission = (value: number) => (Number.isNaN(value) ? null : value);

type ProfessionalAssignmentsFormProps = {
  businessId: string;
  professional: Professional;
};

export function ProfessionalAssignmentsForm({ businessId, professional }: ProfessionalAssignmentsFormProps) {
  const { data: catalogServices } = useSuspenseQuery(catalogQueries.services(businessId));
  const { data: catalogPackages } = useSuspenseQuery(catalogQueries.packages(businessId));

  const services: CatalogOption[] = catalogServices.map((service) => ({
    id: service.id,
    name: service.name,
    isActive: service.isActive,
    durationInMinutes: service.durationInMinutes,
    price: service.price,
    usesOwnCommission: true,
  }));
  const packages: CatalogOption[] = catalogPackages.map((item) => ({
    id: item.id,
    name: item.name,
    isActive: item.isActive,
    durationInMinutes: item.durationMinutes,
    price: item.price,
    usesOwnCommission: item.commissionMode === 'package',
  }));
  const catalogKey = [...services, ...packages].map(({ id }) => id).join();

  return (
    <AssignmentsForm
      key={catalogKey}
      businessId={businessId}
      professional={professional}
      services={services}
      packages={packages}
    />
  );
}

type AssignmentsFormProps = ProfessionalAssignmentsFormProps & {
  services: CatalogOption[];
  packages: CatalogOption[];
};

function AssignmentsForm({ businessId, professional, services, packages }: AssignmentsFormProps) {
  const form = useForm<AssignmentsValues>({
    resolver: zodResolver(assignmentsSchema),
    defaultValues: toFormValues(professional, services, packages),
  });
  const { errors, isDirty } = useFormState({ control: form.control });

  const setAssignments = useSetProfessionalAssignments(businessId, professional.id, {
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.SERVICE_NOT_FOUND) || hasErrorCode(error, ErrorCode.PACKAGE_NOT_FOUND)) {
        form.setError('root.server', {
          message: 'Algum serviço ou pacote escolhido foi excluído. Recarregue a página e revise a seleção.',
        });
        return;
      }
      applyApiErrors(form, error);
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setAssignments.mutate(
      {
        services: values.services
          .filter(({ selected }) => selected)
          .map(({ id, commissionPercent }) => ({ serviceId: id, commissionPercent: toCommission(commissionPercent) })),
        packages: values.packages
          .filter(({ selected }) => selected)
          .map(({ id, commissionPercent }) => ({ packageId: id, commissionPercent: toCommission(commissionPercent) })),
      },
      {
        onSuccess: (saved) => {
          form.reset(toFormValues(saved, services, packages));
          toast.success('Serviços e pacotes salvos.');
        },
      },
    );
  });

  const selectAllServices = () => {
    services.forEach((_service, index) => {
      form.setValue(`services.${index}.selected`, true, { shouldDirty: true });
    });
  };

  const serverError = errors.root?.server?.message;
  const defaultCommission = formatPercent(professional.commissionPercent);
  const basePath = businessPath(businessId);

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Só aparecem para este profissional os horários dos serviços e pacotes marcados. Comissão em branco usa a
        padrão dele ({defaultCommission}).
      </p>

      {serverError && (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Serviços</CardTitle>
          <CardDescription>Para agendar vários serviços juntos, o profissional precisa fazer todos.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {services.length === 0 ? (
            <EmptyCatalogAlert to={`${basePath}/catalog/services`} label="Cadastre serviços no catálogo" />
          ) : (
            <>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={selectAllServices}>
                  Marcar todos
                </Button>
              </div>
              <AssignmentList
                control={form.control}
                name="services"
                options={services}
                defaultCommission={professional.commissionPercent}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pacotes</CardTitle>
          <CardDescription>Um pacote só pode ser agendado com os profissionais marcados aqui.</CardDescription>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <EmptyCatalogAlert to={`${basePath}/catalog/packages`} label="Nenhum pacote no catálogo ainda" />
          ) : (
            <AssignmentList
              control={form.control}
              name="packages"
              options={packages}
              defaultCommission={professional.commissionPercent}
            />
          )}
        </CardContent>
      </Card>

      {isDirty && (
        <SaveBar aria-label="Alterações não salvas">
          <SaveBarMessage>Você tem alterações não salvas.</SaveBarMessage>
          <SaveBarActions>
            <Button type="button" variant="ghost" disabled={setAssignments.isPending} onClick={() => form.reset()}>
              Descartar
            </Button>
            <Button type="submit" disabled={setAssignments.isPending}>
              {setAssignments.isPending && <Spinner />}
              Salvar
            </Button>
          </SaveBarActions>
        </SaveBar>
      )}
    </form>
  );
}

type EmptyCatalogAlertProps = {
  to: string;
  label: string;
};

function EmptyCatalogAlert({ to, label }: EmptyCatalogAlertProps) {
  return (
    <Alert>
      <InfoIcon />
      <AlertDescription>
        <Link to={to} className="font-medium underline-offset-4 hover:underline">
          {label}
        </Link>
      </AlertDescription>
    </Alert>
  );
}

type AssignmentListProps = {
  control: Control<AssignmentsValues>;
  name: 'services' | 'packages';
  options: CatalogOption[];
  defaultCommission: number;
};

function AssignmentList({ control, name, options, defaultCommission }: AssignmentListProps) {
  return (
    <ul className="flex flex-col divide-y rounded-2xl border">
      {options.map((option, index) => (
        <AssignmentRow
          key={option.id}
          control={control}
          name={name}
          index={index}
          option={option}
          defaultCommission={defaultCommission}
        />
      ))}
    </ul>
  );
}

type AssignmentRowProps = {
  control: Control<AssignmentsValues>;
  name: 'services' | 'packages';
  index: number;
  option: CatalogOption;
  defaultCommission: number;
};

function AssignmentRow({ control, name, index, option, defaultCommission }: AssignmentRowProps) {
  const selected = useWatch({ control, name: `${name}.${index}.selected` });
  const checkboxId = `assignment-${name}-${option.id}`;

  return (
    <li className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
      <label htmlFor={checkboxId} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm">
        <Controller
          control={control}
          name={`${name}.${index}.selected`}
          render={({ field }) => (
            <Checkbox id={checkboxId} checked={field.value} onCheckedChange={(checked) => field.onChange(checked)} />
          )}
        />
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate">{option.name}</span>
          {!option.isActive && <Badge variant="secondary">Inativo</Badge>}
        </span>
        <span className="hidden shrink-0 text-muted-foreground sm:inline">{formatMinutes(option.durationInMinutes)}</span>
        <span className="hidden w-20 shrink-0 text-right tabular-nums sm:inline">{formatCurrency(option.price)}</span>
      </label>

      <div className="flex shrink-0 justify-end pl-7 sm:w-28 sm:pl-0">
        {selected &&
          (option.usesOwnCommission ? (
            <Controller
              control={control}
              name={`${name}.${index}.commissionPercent`}
              render={({ field, fieldState }) => (
                <div className="flex w-full flex-col gap-1">
                  <CommissionInput
                    id={`${checkboxId}-commission`}
                    ref={field.ref}
                    name={field.name}
                    onBlur={field.onBlur}
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                    placeholder={String(defaultCommission)}
                    aria-label={`Comissão de ${option.name}`}
                  />
                  <FieldError errors={[fieldState.error]} />
                </div>
              )}
            />
          ) : (
            <span className="text-xs text-muted-foreground">Comissão por serviço</span>
          ))}
      </div>
    </li>
  );
}
