import { AppointmentRemindersTask } from './appointment-reminders.task.js';
import { AppointmentsController, CustomerAppointmentsController, MyAppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import { AvailabilityController, PublicAvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';

export { AvailabilityService } from './availability.service.js';
export { AppointmentsService } from './appointments.service.js';
export {
    AppointmentEvent,
    type AppointmentCreatedEvent,
    type AppointmentOrigin,
    type AppointmentReminderDueEvent,
    type AppointmentRescheduledEvent,
    type AppointmentStatusChangedEvent,
} from './appointment-events.js';

export const appointmentsControllers = [
    AvailabilityController,
    PublicAvailabilityController,
    AppointmentsController,
    CustomerAppointmentsController,
    MyAppointmentsController,
];
export const appointmentsProviders = [AvailabilityService, AppointmentsService, AppointmentRemindersTask];
