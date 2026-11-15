import { Field, FieldLabel } from '@packages/ui/components/field';
import { Input } from '@packages/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@packages/ui/components/select';
import type { Professional } from '@/features/professionals';
import type { DashboardFilters as ResolvedFilters } from '../api/dashboard.api';
import { PERIOD_LABELS, PERIOD_PRESETS, type PeriodPreset } from '../period';

const ALL_PROFESSIONALS = 'all';

type DashboardFiltersProps = {
  period: PeriodPreset;
  resolved: ResolvedFilters;
  todayKey: string;
  professionals: Professional[] | null;
  onPeriodChange: (period: PeriodPreset, range?: { from: string; to: string }) => void;
  onCustomRangeChange: (range: { from: string; to: string }) => void;
  onProfessionalChange: (professionalId: string | null) => void;
};

export function DashboardFilters({
  period,
  resolved,
  todayKey,
  professionals,
  onPeriodChange,
  onCustomRangeChange,
  onProfessionalChange,
}: DashboardFiltersProps) {
  const periodItems = PERIOD_PRESETS.map((preset) => ({ value: preset, label: PERIOD_LABELS[preset] }));
  const professionalItems = [
    { value: ALL_PROFESSIONALS, label: 'Todos os profissionais' },
    ...(professionals ?? []).map(({ id, displayName }) => ({ value: id, label: displayName })),
  ];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field className="w-full sm:w-52">
        <FieldLabel htmlFor="dashboard-period">Período</FieldLabel>
        <Select
          items={periodItems}
          value={period}
          onValueChange={(value) => {
            if (typeof value !== 'string') return;
            const preset = PERIOD_PRESETS.find((candidate) => candidate === value);
            if (!preset) return;
            onPeriodChange(preset, preset === 'custom' ? { from: resolved.from, to: resolved.to } : undefined);
          }}
        >
          <SelectTrigger id="dashboard-period" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {period === 'custom' && (
        <>
          <Field className="w-[calc(50%-0.375rem)] sm:w-40">
            <FieldLabel htmlFor="dashboard-from">De</FieldLabel>
            <Input
              id="dashboard-from"
              type="date"
              value={resolved.from}
              max={resolved.to}
              onChange={(event) => event.target.value && onCustomRangeChange({ from: event.target.value, to: resolved.to })}
            />
          </Field>
          <Field className="w-[calc(50%-0.375rem)] sm:w-40">
            <FieldLabel htmlFor="dashboard-to">Até</FieldLabel>
            <Input
              id="dashboard-to"
              type="date"
              value={resolved.to}
              min={resolved.from}
              max={todayKey}
              onChange={(event) => event.target.value && onCustomRangeChange({ from: resolved.from, to: event.target.value })}
            />
          </Field>
        </>
      )}

      {professionals && professionals.length > 1 && (
        <Field className="w-full sm:w-60">
          <FieldLabel htmlFor="dashboard-professional">Profissional</FieldLabel>
          <Select
            items={professionalItems}
            value={resolved.professionalId ?? ALL_PROFESSIONALS}
            onValueChange={(value) =>
              onProfessionalChange(typeof value === 'string' && value !== ALL_PROFESSIONALS ? value : null)
            }
          >
            <SelectTrigger id="dashboard-professional" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {professionalItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}
