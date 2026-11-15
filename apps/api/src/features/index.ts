import { BullModule } from '@nestjs/bullmq';
import { appointmentsControllers, appointmentsProviders } from './appointments/index.js';
import { authControllers, authProviders } from './auth/index.js';
import { businessesControllers, businessesProviders } from './businesses/index.js';
import { catalogControllers, catalogProviders } from './catalog/index.js';
import { customersControllers, customersProviders } from './customers/index.js';
import { dashboardControllers, dashboardProviders } from './dashboard/index.js';
import { notificationsControllers, notificationsProviders } from './notifications/index.js';
import { paymentsControllers, paymentsProviders } from './payments/index.js';
import { postalCodesControllers, postalCodesProviders } from './postal-codes/index.js';
import { professionalsControllers, professionalsProviders } from './professionals/index.js';
import { reviewsControllers, reviewsProviders } from './reviews/index.js';
import { subscriptionsControllers, subscriptionsProviders } from './subscriptions/index.js';
import { usersControllers, usersProviders } from './users/index.js';
import {
    whatsappConnectionQueueOptions,
    whatsappControllers,
    whatsappMessageQueueOptions,
    whatsappProviders,
} from './whatsapp/index.js';

export const featureImports = [
    BullModule.registerQueue(whatsappConnectionQueueOptions, whatsappMessageQueueOptions),
];

export const featureControllers = [
    ...authControllers,
    ...usersControllers,
    ...businessesControllers,
    ...catalogControllers,
    ...professionalsControllers,
    ...customersControllers,
    ...appointmentsControllers,
    ...paymentsControllers,
    ...reviewsControllers,
    ...notificationsControllers,
    ...whatsappControllers,
    ...postalCodesControllers,
    ...subscriptionsControllers,
    ...dashboardControllers,
];

export const featureProviders = [
    ...usersProviders,
    ...authProviders,
    ...businessesProviders,
    ...catalogProviders,
    ...professionalsProviders,
    ...customersProviders,
    ...appointmentsProviders,
    ...paymentsProviders,
    ...reviewsProviders,
    ...notificationsProviders,
    ...whatsappProviders,
    ...postalCodesProviders,
    ...subscriptionsProviders,
    ...dashboardProviders,
];
