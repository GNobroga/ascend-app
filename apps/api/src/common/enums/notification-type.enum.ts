export const NotificationType = {
    APPOINTMENT_CREATED: 'appointment_created',
    APPOINTMENT_CONFIRMED: 'appointment_confirmed',
    APPOINTMENT_RESCHEDULED: 'appointment_rescheduled',
    APPOINTMENT_CANCELLED: 'appointment_cancelled',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    APPOINTMENT_COMPLETED: 'appointment_completed',
    PAYMENT_RECEIVED: 'payment_received',
    REVIEW_RECEIVED: 'review_received',
    WHATSAPP_DISCONNECTED: 'whatsapp_disconnected',
    GENERAL: 'general',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
