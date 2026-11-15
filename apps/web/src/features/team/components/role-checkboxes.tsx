import { Checkbox } from '@packages/ui/components/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@packages/ui/components/field';
import type { FieldError as FormFieldError } from 'react-hook-form';
import type { BusinessMemberRole } from '@/features/businesses';
import { ROLE_OPTIONS } from '../roles';

type RoleCheckboxesProps = {
  idPrefix: string;
  value: BusinessMemberRole[];
  onChange: (roles: BusinessMemberRole[]) => void;
  lockedRoles?: BusinessMemberRole[];
  error?: FormFieldError;
};

export function RoleCheckboxes({ idPrefix, value, onChange, lockedRoles = [], error }: RoleCheckboxesProps) {
  const toggle = (role: BusinessMemberRole, checked: boolean) =>
    onChange(checked ? [...value, role] : value.filter((current) => current !== role));

  return (
    <FieldSet data-invalid={Boolean(error)}>
      <FieldLegend variant="label">Papéis</FieldLegend>
      {ROLE_OPTIONS.map((option) => {
        const id = `${idPrefix}-${option.value}`;
        const isLocked = lockedRoles.includes(option.value);
        return (
          <Field key={option.value} orientation="horizontal" data-disabled={isLocked}>
            <Checkbox
              id={id}
              checked={value.includes(option.value)}
              disabled={isLocked}
              aria-invalid={Boolean(error)}
              onCheckedChange={(checked) => toggle(option.value, checked)}
            />
            <FieldContent>
              <FieldLabel htmlFor={id} className="font-normal">
                {option.label}
              </FieldLabel>
              <FieldDescription>
                {isLocked ? 'Só um proprietário pode conceder ou retirar este papel.' : option.description}
              </FieldDescription>
            </FieldContent>
          </Field>
        );
      })}
      <FieldError errors={[error]} />
    </FieldSet>
  );
}
