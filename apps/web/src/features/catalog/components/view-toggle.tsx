import { ToggleGroup, ToggleGroupItem } from '@packages/ui/components/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@packages/ui/components/tooltip';
import type { LucideIcon } from 'lucide-react';

export type ViewOption<TView extends string> = {
  value: TView;
  label: string;
  icon: LucideIcon;
};

type ViewToggleProps<TView extends string> = {
  options: Array<ViewOption<TView>>;
  value: TView;
  onValueChange: (value: TView) => void;
};

export function ViewToggle<TView extends string>({ options, value, onValueChange }: ViewToggleProps<TView>) {
  return (
    <ToggleGroup
      aria-label="Visualização"
      variant="outline"
      size="lg"
      spacing={0}
      value={[value]}
      onValueChange={([next]) => {
        const option = options.find((candidate) => candidate.value === next);
        if (option) onValueChange(option.value);
      }}
    >
      {options.map(({ value: optionValue, label, icon: Icon }) => (
        <Tooltip key={optionValue}>
          <TooltipTrigger render={<ToggleGroupItem value={optionValue} aria-label={label} />}>
            <Icon />
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}
