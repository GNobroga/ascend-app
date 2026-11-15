import { api } from '@/shared/api/http';
import type {
  DashboardBreakdown,
  DashboardHeatmap,
  DashboardInactiveCustomers,
  DashboardOccupancyReport,
  DashboardPaymentMethodItem,
  DashboardProfessionalItem,
  DashboardServiceItem,
  DashboardSummary,
  DashboardTimeseries,
} from '../types';

export type DashboardFilters = {
  from: string;
  to: string;
  compareFrom: string | null;
  compareTo: string | null;
  professionalId: string | null;
};

const rangeParams = ({ from, to, professionalId }: DashboardFilters) => ({ from, to, professionalId: professionalId ?? undefined });

const comparisonParams = (filters: DashboardFilters) => ({
  ...rangeParams(filters),
  compareFrom: filters.compareFrom ?? undefined,
  compareTo: filters.compareTo ?? undefined,
});

const dashboardPath = (businessId: string) => `/businesses/${businessId}/dashboard`;

export const dashboardApi = {
  summary: (businessId: string, filters: DashboardFilters) =>
    api.get<DashboardSummary>(`${dashboardPath(businessId)}/summary`, { params: comparisonParams(filters) }),
  heatmap: (businessId: string, filters: DashboardFilters) =>
    api.get<DashboardHeatmap>(`${dashboardPath(businessId)}/heatmap`, { params: rangeParams(filters) }),
  occupancy: (businessId: string, filters: DashboardFilters) =>
    api.get<DashboardOccupancyReport>(`${dashboardPath(businessId)}/occupancy`, { params: comparisonParams(filters) }),
  timeseries: (businessId: string, filters: DashboardFilters) =>
    api.get<DashboardTimeseries>(`${dashboardPath(businessId)}/timeseries`, { params: rangeParams(filters) }),
  professionals: (businessId: string, filters: DashboardFilters) =>
    api.get<DashboardBreakdown<DashboardProfessionalItem>>(`${dashboardPath(businessId)}/professionals`, {
      params: rangeParams(filters),
    }),
  services: (businessId: string, filters: DashboardFilters) =>
    api.get<DashboardBreakdown<DashboardServiceItem>>(`${dashboardPath(businessId)}/services`, {
      params: rangeParams(filters),
    }),
  paymentMethods: (businessId: string, filters: DashboardFilters) =>
    api.get<DashboardBreakdown<DashboardPaymentMethodItem>>(`${dashboardPath(businessId)}/payment-methods`, {
      params: rangeParams(filters),
    }),
  inactiveCustomers: (businessId: string, professionalId: string | null) =>
    api.get<DashboardInactiveCustomers>(`${dashboardPath(businessId)}/inactive-customers`, {
      params: { professionalId: professionalId ?? undefined },
    }),
};
