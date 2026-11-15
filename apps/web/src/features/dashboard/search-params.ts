import { createLoader, parseAsString, parseAsStringLiteral } from 'nuqs';
import { DEFAULT_PERIOD, PERIOD_PRESETS } from './period';

export const dashboardSearchParams = {
  period: parseAsStringLiteral(PERIOD_PRESETS).withDefault(DEFAULT_PERIOD),
  from: parseAsString,
  to: parseAsString,
  professional: parseAsString,
};

export const loadDashboardSearchParams = createLoader(dashboardSearchParams);
