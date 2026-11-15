import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

export { PaymentEvent, type PaymentChangedEvent } from './payment-events.js';

export const paymentsControllers = [PaymentsController];
export const paymentsProviders = [PaymentsService];
