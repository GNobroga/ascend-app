import type { AppointmentOrigin } from '../../common/enums/appointment-origin.enum.js';
import type { AppointmentStatus } from '../../common/enums/appointment-status.enum.js';

export const AppointmentEvent = {
    CREATED: 'appointment.created',
    RESCHEDULED: 'appointment.rescheduled',
    STATUS_CHANGED: 'appointment.status_changed',
    REMINDER_DUE: 'appointment.reminder_due',
} as const;

export type { AppointmentOrigin };

interface AppointmentEventBase {
    appointmentId: string;
    businessId: string;
    actorUserId: string;
    origin: AppointmentOrigin;
}

export type AppointmentCreatedEvent = AppointmentEventBase;

export interface AppointmentRescheduledEvent extends AppointmentEventBase {
    previousStartAt: Date;
    previousProfessionalId: string;
}

export interface AppointmentReminderDueEvent {
    appointmentId: string;
    businessId: string;
}

export interface AppointmentStatusChangedEvent extends AppointmentEventBase {
    previousStatus: AppointmentStatus;
    status: AppointmentStatus;
    reason: string | null;
}
