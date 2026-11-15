import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@packages/ui/components/input-group';
import type { ComponentProps } from 'react';

type CommissionInputProps = Omit<ComponentProps<typeof InputGroupInput>, 'type' | 'value' | 'onChange'> & {
  value: number;
  onValueChange: (value: number) => void;
  groupClassName?: string;
};

export function CommissionInput({ value, onValueChange, groupClassName, placeholder = '0', ...props }: CommissionInputProps) {
  return (
    <InputGroup className={groupClassName}>
      <InputGroupInput
        {...props}
        type="number"
        min={0}
        max={100}
        step={0.01}
        inputMode="decimal"
        placeholder={placeholder}
        value={Number.isNaN(value) ? '' : value}
        onChange={(event) => onValueChange(event.target.valueAsNumber)}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>%</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}
