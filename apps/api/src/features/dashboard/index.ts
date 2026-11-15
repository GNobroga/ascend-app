import { DashboardCacheService } from './dashboard-cache.service.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

export const dashboardControllers = [DashboardController];
export const dashboardProviders = [DashboardService, DashboardCacheService];
