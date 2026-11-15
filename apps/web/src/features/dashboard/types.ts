export type DashboardScope = 'business' | 'professional';

export type DashboardInterval = 'day' | 'week' | 'month';

export type DashboardPeriod = {
  from: string;
  to: string;
};

export type DashboardMetrics = {
  appointments: number;
  cancelled: number;
  completed: number;
  noShows: number;
  revenue: number;
  received: number;
  receivable: number;
  averageTicket: number | null;
  noShowRate: number | null;
  cancellationRate: number | null;
  customersServed: number;
  newCustomers: number;
  returningCustomers: number;
  averageRating: number | null;
  ratingCount: number;
  onlineShare: number | null;
  commission: number;
};

export type DashboardSummary = {
  scope: DashboardScope;
  professionalId: string | null;
  hasCompletedAppointments: boolean;
  period: DashboardPeriod;
  comparison: DashboardPeriod;
  current: DashboardMetrics;
  previous: DashboardMetrics;
};

export type DashboardBucket = {
  start: string;
  appointments: number;
  completed: number;
  cancelled: number;
  noShows: number;
  revenue: number;
  received: number;
  commission: number;
  newCustomers: number;
  averageRating: number | null;
  ratingCount: number;
};

export type DashboardTimeseries = {
  scope: DashboardScope;
  professionalId: string | null;
  interval: DashboardInterval;
  period: DashboardPeriod;
  buckets: DashboardBucket[];
};

export type DashboardProfessionalItem = {
  professionalId: string;
  name: string;
  completed: number;
  noShows: number;
  revenue: number;
  averageTicket: number | null;
  noShowRate: number | null;
  averageRating: number | null;
  ratingCount: number;
  commission: number;
};

export type DashboardServiceItem = {
  type: 'service' | 'package';
  id: string;
  name: string;
  quantity: number;
  revenue: number;
};

export type DashboardPaymentMethodItem = {
  paymentMethodId: string;
  name: string;
  received: number;
  payments: number;
};

export type DashboardBreakdown<T> = {
  period: DashboardPeriod;
  items: T[];
};

export type DashboardInactiveCustomer = {
  customerId: string;
  name: string;
  phone: string | null;
  lastCompletedAt: string;
  completedCount: number;
};

export type DashboardInactiveCustomers = {
  inactiveAfterDays: number;
  total: number;
  items: DashboardInactiveCustomer[];
};

export type DashboardHeatmapCell = {
  weekday: number;
  hour: number;
  appointments: number;
};

export type DashboardHeatmap = {
  scope: DashboardScope;
  professionalId: string | null;
  period: DashboardPeriod;
  cells: DashboardHeatmapCell[];
};

export type DashboardOccupancy = {
  bookedMinutes: number;
  availableMinutes: number;
  rate: number | null;
};

export type DashboardProfessionalOccupancy = DashboardOccupancy & {
  professionalId: string;
  name: string;
};

export type DashboardOccupancyReport = {
  scope: DashboardScope;
  professionalId: string | null;
  period: DashboardPeriod;
  comparison: DashboardPeriod;
  current: DashboardOccupancy;
  previous: DashboardOccupancy;
  professionals: DashboardProfessionalOccupancy[];
};
