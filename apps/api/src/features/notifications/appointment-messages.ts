import { NotificationType } from '../../common/enums/notification-type.enum.js';
import type { AppointmentEntity } from '../../database/entities/appointment.entity.js';

export interface AppointmentSummary {
    businessName: string;
    customerName: string;
    professionalName: string;
    services: string;
    when: string;
}

export interface NotificationContent {
    type: NotificationType;
    title: string;
    message: string;
}

const listFormat = new Intl.ListFormat('pt-BR', { type: 'conjunction' });

export const formatWhen = (instant: Date, timeZone: string): string =>
    new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone }).format(instant);

export const summarize = (appointment: AppointmentEntity): AppointmentSummary => ({
    businessName: appointment.customer.business.name,
    customerName: appointment.customer.name,
    professionalName: appointment.professional.displayName,
    services: appointment.package
        ? `Pacote ${appointment.package.name}`
        : listFormat.format(appointment.services.map((line) => line.service.name)),
    when: formatWhen(appointment.startAt, appointment.customer.business.timezone),
});

const withReason = (text: string, reason: string | null): string => (reason ? `${text} Motivo: ${reason}` : text);

export const customerMessages = {
    booked: (s: AppointmentSummary, pending: boolean): NotificationContent => (pending
        ? {
            type: NotificationType.APPOINTMENT_CREATED,
            title: 'Agendamento recebido',
            message: `Seu pedido de horário em ${s.businessName} para ${s.when} foi recebido e aguarda confirmação.`,
        }
        : {
            type: NotificationType.APPOINTMENT_CREATED,
            title: 'Agendamento confirmado',
            message: `Seu horário em ${s.businessName} está confirmado para ${s.when}.`,
        }),
    confirmed: (s: AppointmentSummary): NotificationContent => ({
        type: NotificationType.APPOINTMENT_CONFIRMED,
        title: 'Agendamento confirmado',
        message: `Seu horário em ${s.businessName} está confirmado para ${s.when}.`,
    }),
    rescheduled: (s: AppointmentSummary): NotificationContent => ({
        type: NotificationType.APPOINTMENT_RESCHEDULED,
        title: 'Agendamento remarcado',
        message: `Seu horário em ${s.businessName} foi remarcado para ${s.when}, com ${s.professionalName}.`,
    }),
    cancelledByBusiness: (s: AppointmentSummary, reason: string | null): NotificationContent => ({
        type: NotificationType.APPOINTMENT_CANCELLED,
        title: 'Agendamento cancelado',
        message: withReason(`${s.businessName} cancelou seu horário de ${s.when}.`, reason),
    }),
    reminder: (s: AppointmentSummary): NotificationContent => ({
        type: NotificationType.APPOINTMENT_REMINDER,
        title: 'Lembrete de agendamento',
        message: `Lembrete: seu horário em ${s.businessName} é ${s.when}, com ${s.professionalName}.`,
    }),
    reviewInvite: (s: AppointmentSummary): NotificationContent => ({
        type: NotificationType.APPOINTMENT_COMPLETED,
        title: 'Como foi seu atendimento?',
        message: `Conte como foi seu atendimento em ${s.businessName} com ${s.professionalName}. Sua avaliação ajuda outros clientes.`,
    }),
    cancelledByCustomer: (s: AppointmentSummary): NotificationContent => ({
        type: NotificationType.APPOINTMENT_CANCELLED,
        title: 'Cancelamento confirmado',
        message: `Seu horário em ${s.businessName} de ${s.when} foi cancelado.`,
    }),
};

export const toWhatsAppText = (content: NotificationContent, s: AppointmentSummary): string => [
    `Olá, ${s.customerName.split(' ')[0]}!`,
    '',
    `*${content.title}*`,
    content.message,
    '',
    `Serviço: ${s.services}`,
    '',
    `_${s.businessName}. Se não quiser mais receber mensagens por aqui, é só avisar._`,
].join('\n');

export const teamMessages = {
    booked: (s: AppointmentSummary, byCustomer: boolean, pending: boolean): NotificationContent => ({
        type: NotificationType.APPOINTMENT_CREATED,
        title: pending ? 'Novo pedido de agendamento' : 'Novo agendamento',
        message: (byCustomer
            ? `${s.customerName} agendou ${s.services} com ${s.professionalName} para ${s.when}.`
            : `Agendamento de ${s.customerName}: ${s.services} com ${s.professionalName} em ${s.when}.`)
            + (pending ? ' Aguarda confirmação.' : ''),
    }),
    rescheduled: (s: AppointmentSummary): NotificationContent => ({
        type: NotificationType.APPOINTMENT_RESCHEDULED,
        title: 'Agendamento remarcado',
        message: `O atendimento de ${s.customerName} (${s.services}) foi remarcado para ${s.when}, com ${s.professionalName}.`,
    }),
    transferred: (s: AppointmentSummary, previousWhen: string): NotificationContent => ({
        type: NotificationType.APPOINTMENT_RESCHEDULED,
        title: 'Agendamento transferido',
        message: `O atendimento de ${s.customerName} (${s.services}) de ${previousWhen} passou para ${s.professionalName}.`,
    }),
    reviewReceived: (s: AppointmentSummary, rating: number): NotificationContent => ({
        type: NotificationType.REVIEW_RECEIVED,
        title: 'Nova avaliação',
        message: `${s.customerName} avaliou com nota ${rating} o atendimento de ${s.when} com ${s.professionalName}.`,
    }),
    cancelled: (s: AppointmentSummary, byCustomer: boolean, reason: string | null): NotificationContent => ({
        type: NotificationType.APPOINTMENT_CANCELLED,
        title: 'Agendamento cancelado',
        message: withReason(byCustomer
            ? `${s.customerName} cancelou o atendimento de ${s.when} (${s.services}).`
            : `O atendimento de ${s.customerName} de ${s.when} (${s.services}) foi cancelado.`, reason),
    }),
};
