import { appointmentsPath } from '@/features/appointments';
import { settingsPath } from '@/features/businesses';
import { reviewsPath } from '@/features/reviews';
import { NotificationType, type Notification } from './types';

export const notificationLink = ({ type, businessId, appointmentId }: Notification, memberBusinessIds: Set<string>) => {
  if (!businessId || !memberBusinessIds.has(businessId)) return null;
  if (type === NotificationType.REVIEW_RECEIVED) return reviewsPath(businessId);
  if (type === NotificationType.WHATSAPP_DISCONNECTED) return settingsPath(businessId, 'whatsapp');
  if (!appointmentId) return null;
  return `${appointmentsPath(businessId)}?${new URLSearchParams({ appointment: appointmentId })}`;
};
