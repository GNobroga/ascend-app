import { useQueryStates } from 'nuqs';
import { businessToday, resolveFilters } from '../period';
import { dashboardSearchParams } from '../search-params';

export function useDashboardFilters(timeZone: string, canManage: boolean) {
  const [params, setParams] = useQueryStates(dashboardSearchParams);
  const todayKey = businessToday(timeZone);
  const filters = resolveFilters({ ...params, professionalId: canManage ? params.professional : null }, todayKey);

  return { params, setParams, todayKey, filters };
}
