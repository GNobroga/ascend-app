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

export const NotificationStatus = {
  UNREAD: 'unread',
  READ: 'read',
} as const;

export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export type Notification = {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  readAt: string | null;
  businessId: string | null;
  appointmentId: string | null;
  createdAt: string;
};

export type UnreadCount = {
  count: number;
};
