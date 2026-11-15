import { AppointmentNotificationsListener } from './appointment-notifications.listener.js';
import { InMemoryNotificationStream, NotificationStream } from './notification-stream.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { WhatsAppNotificationsListener } from './whatsapp-notifications.listener.js';

export { NotificationsService } from './notifications.service.js';

export const notificationsControllers = [NotificationsController];
export const notificationsProviders = [
    NotificationsService,
    AppointmentNotificationsListener,
    WhatsAppNotificationsListener,
    { provide: NotificationStream, useClass: InMemoryNotificationStream },
];
