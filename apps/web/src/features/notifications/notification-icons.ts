import {
  BellIcon,
  BellRingIcon,
  CalendarCheckIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CalendarXIcon,
  CircleCheckIcon,
  StarIcon,
  UnplugIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import { NotificationType } from './types';

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  [NotificationType.APPOINTMENT_CREATED]: CalendarPlusIcon,
  [NotificationType.APPOINTMENT_CONFIRMED]: CalendarCheckIcon,
  [NotificationType.APPOINTMENT_RESCHEDULED]: CalendarClockIcon,
  [NotificationType.APPOINTMENT_CANCELLED]: CalendarXIcon,
  [NotificationType.APPOINTMENT_REMINDER]: BellRingIcon,
  [NotificationType.APPOINTMENT_COMPLETED]: CircleCheckIcon,
  [NotificationType.PAYMENT_RECEIVED]: WalletIcon,
  [NotificationType.REVIEW_RECEIVED]: StarIcon,
  [NotificationType.WHATSAPP_DISCONNECTED]: UnplugIcon,
  [NotificationType.GENERAL]: BellIcon,
};
