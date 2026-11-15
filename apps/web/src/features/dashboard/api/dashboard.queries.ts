import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { dashboardApi, type DashboardFilters } from './dashboard.api';

export const dashboardQueries = {
  all: (businessId: string) => ['dashboard', businessId] as const,
  summary: (businessId: string, filters: DashboardFilters) =>
    queryOptions({
      queryKey: [...dashboardQueries.all(businessId), 'summary', filters],
      queryFn: () => dashboardApi.summary(businessId, filters),
      placeholderData: keepPreviousData,
    }),
  timeseries: (businessId: string, filters: DashboardFilters) =>
    queryOptions({
      queryKey: [...dashboardQueries.all(businessId), 'timeseries', filters.from, filters.to, filters.professionalId],
      queryFn: () => dashboardApi.timeseries(businessId, filters),
      placeholderData: keepPreviousData,
    }),
  heatmap: (businessId: string, filters: DashboardFilters) =>
    queryOptions({
      queryKey: [...dashboardQueries.all(businessId), 'heatmap', filters.from, filters.to, filters.professionalId],
      queryFn: () => dashboardApi.heatmap(businessId, filters),
      placeholderData: keepPreviousData,
    }),
  occupancy: (businessId: string, filters: DashboardFilters) =>
    queryOptions({
      queryKey: [...dashboardQueries.all(businessId), 'occupancy', filters],
      queryFn: () => dashboardApi.occupancy(businessId, filters),
      placeholderData: keepPreviousData,
    }),
  professionals: (businessId: string, filters: DashboardFilters) =>
    queryOptions({
      queryKey: [...dashboardQueries.all(businessId), 'professionals', filters.from, filters.to, filters.professionalId],
      queryFn: () => dashboardApi.professionals(businessId, filters),
      placeholderData: keepPreviousData,
    }),
  services: (businessId: string, filters: DashboardFilters) =>
    queryOptions({
      queryKey: [...dashboardQueries.all(businessId), 'services', filters.from, filters.to, filters.professionalId],
      queryFn: () => dashboardApi.services(businessId, filters),
      placeholderData: keepPreviousData,
    }),
  paymentMethods: (businessId: string, filters: DashboardFilters) =>
    queryOptions({
      queryKey: [...dashboardQueries.all(businessId), 'paymentMethods', filters.from, filters.to, filters.professionalId],
      queryFn: () => dashboardApi.paymentMethods(businessId, filters),
      placeholderData: keepPreviousData,
    }),
  inactiveCustomers: (businessId: string, professionalId: string | null) =>
    queryOptions({
      queryKey: [...dashboardQueries.all(businessId), 'inactiveCustomers', professionalId],
      queryFn: () => dashboardApi.inactiveCustomers(businessId, professionalId),
      placeholderData: keepPreviousData,
    }),
};
