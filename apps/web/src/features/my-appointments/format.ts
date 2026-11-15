import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentStatus } from '@/features/appointments';
import type { MyAppointment } from './types';

export const CUSTOMER_STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.PENDING]: 'Aguardando confirmação',
  [AppointmentStatus.CONFIRMED]: 'Confirmado',
  [AppointmentStatus.IN_PROGRESS]: 'Em atendimento',
  [AppointmentStatus.COMPLETED]: 'Concluído',
  [AppointmentStatus.CANCELLED]: 'Cancelado',
  [AppointmentStatus.NO_SHOW]: 'Não compareceu',
};

const zoned = (value: string, timeZone: string) => new TZDate(value, timeZone);

export const formatAppointmentDay = (value: string, timeZone: string) =>
  format(zoned(value, timeZone), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

export const formatTime = (value: string, timeZone: string) => format(zoned(value, timeZone), 'HH:mm');

export const formatDeadline = (value: string, timeZone: string) =>
  format(zoned(value, timeZone), "d 'de' MMM 'às' HH:mm", { locale: ptBR });

export const whatWasBooked = (appointment: MyAppointment) =>
  appointment.package?.name ?? appointment.services.map(({ name }) => name).join(', ');

export const isOpen = (appointment: MyAppointment) =>
  appointment.status === AppointmentStatus.PENDING || appointment.status === AppointmentStatus.CONFIRMED;
