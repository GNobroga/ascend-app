import { ActivationBonusListener } from './activation-bonus.listener.js';
import { SubscriptionsController } from './subscriptions.controller.js';
import { SubscriptionsService } from './subscriptions.service.js';

export const subscriptionsControllers = [SubscriptionsController];
export const subscriptionsProviders = [SubscriptionsService, ActivationBonusListener];
