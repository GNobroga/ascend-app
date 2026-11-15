import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum.js';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import { toLocalDate } from '../../common/utilities/time-zone.js';
import { MailDispatcher } from '../../common/mail/mail-dispatcher.service.js';
import { env } from '../../config/env.config.js';
import type { AppointmentEntity } from '../../database/entities/appointment.entity.js';
import type { ProfessionalEntity } from '../../database/entities/professional.entity.js';
import {
    AppointmentEvent,
    AppointmentsService,
    type AppointmentCreatedEvent,
    type AppointmentReminderDueEvent,
    type AppointmentRescheduledEvent,
    type AppointmentStatusChangedEvent,
} from '../appointments/index.js';
import { BusinessMembersService } from '../businesses/index.js';
import { ProfessionalsService } from '../professionals/index.js';
import { ReviewEvent, type ReviewCreatedEvent } from '../reviews/index.js';
import { WhatsAppDispatcher } from '../whatsapp/index.js';
import {
    customerMessages,
    formatWhen,
    summarize,
    teamMessages,
    toWhatsAppText,
    type AppointmentSummary,
    type NotificationContent,
} from './appointment-messages.js';
import { AppointmentMail } from './mails/appointment.mail.js';
import { NotificationsService } from './notifications.service.js';

type Audience = 'customer' | 'team';

interface Delivery {
    audience: Audience;
    inAppUserId: string | null;
    email: { name: string; address: string } | null;
    whatsapp: string | null;
    content: NotificationContent;
}

@Injectable()
export class AppointmentNotificationsListener {

    constructor(
        private readonly appointments: AppointmentsService,
        private readonly members: BusinessMembersService,
        private readonly professionals: ProfessionalsService,
        private readonly notifications: NotificationsService,
        private readonly mail: MailDispatcher,
        private readonly whatsapp: WhatsAppDispatcher,
    ) { }

    @OnEvent(AppointmentEvent.CREATED, { async: true })
    async onCreated(event: AppointmentCreatedEvent): Promise<void> {
        const appointment = await this.appointments.findForNotification(event.appointmentId);
        if (!appointment) {
            return;
        }
        const summary = summarize(appointment);
        const pending = appointment.status === AppointmentStatus.PENDING;
        const byCustomer = event.origin === 'customer';
        const team = teamMessages.booked(summary, byCustomer, pending);

        await this.deliver(appointment, summary, event.actorUserId, [
            AppointmentNotificationsListener.toCustomer(appointment, customerMessages.booked(summary, pending), { inApp: !byCustomer }),
            AppointmentNotificationsListener.toProfessional(appointment.professional, team),
            ...(byCustomer ? await this.toManagers(event.businessId, team) : []),
        ]);
    }

    @OnEvent(AppointmentEvent.RESCHEDULED, { async: true })
    async onRescheduled(event: AppointmentRescheduledEvent): Promise<void> {
        const appointment = await this.appointments.findForNotification(event.appointmentId);
        if (!appointment) {
            return;
        }
        const summary = summarize(appointment);
        const transferred = event.previousProfessionalId !== appointment.professional.id;
        const previousProfessional = transferred ? await this.professionals.findWithUser(event.previousProfessionalId) : null;
        const previousWhen = formatWhen(event.previousStartAt, appointment.customer.business.timezone);

        await this.deliver(appointment, summary, event.actorUserId, [
            AppointmentNotificationsListener.toCustomer(appointment, customerMessages.rescheduled(summary), { inApp: true }),
            AppointmentNotificationsListener.toProfessional(appointment.professional, teamMessages.rescheduled(summary)),
            ...(previousProfessional ? [AppointmentNotificationsListener.toProfessional(previousProfessional, teamMessages.transferred(summary, previousWhen))] : []),
        ]);
    }

    @OnEvent(AppointmentEvent.STATUS_CHANGED, { async: true })
    async onStatusChanged(event: AppointmentStatusChangedEvent): Promise<void> {
        const confirmed = event.previousStatus === AppointmentStatus.PENDING && event.status === AppointmentStatus.CONFIRMED;
        const cancelled = event.status === AppointmentStatus.CANCELLED;
        const completed = event.status === AppointmentStatus.COMPLETED;
        if (!confirmed && !cancelled && !completed) {
            return;
        }
        const appointment = await this.appointments.findForNotification(event.appointmentId);
        if (!appointment) {
            return;
        }
        const summary = summarize(appointment);

        if (completed) {
            if (appointment.customer.user) {
                await this.deliver(appointment, summary, event.actorUserId, [
                    AppointmentNotificationsListener.toCustomer(appointment, customerMessages.reviewInvite(summary), { inApp: true }),
                ]);
            }
            return;
        }

        if (confirmed) {
            await this.deliver(appointment, summary, event.actorUserId, [
                AppointmentNotificationsListener.toCustomer(appointment, customerMessages.confirmed(summary), { inApp: true }),
            ]);
            return;
        }

        const byCustomer = event.origin === 'customer';
        const team = teamMessages.cancelled(summary, byCustomer, event.reason);
        await this.deliver(appointment, summary, event.actorUserId, [
            byCustomer
                ? AppointmentNotificationsListener.toCustomer(appointment, customerMessages.cancelledByCustomer(summary), { inApp: false })
                : AppointmentNotificationsListener.toCustomer(appointment, customerMessages.cancelledByBusiness(summary, event.reason), { inApp: true }),
            AppointmentNotificationsListener.toProfessional(appointment.professional, team),
            ...(byCustomer ? await this.toManagers(event.businessId, team) : []),
        ]);
    }

    @OnEvent(AppointmentEvent.REMINDER_DUE, { async: true })
    async onReminderDue(event: AppointmentReminderDueEvent): Promise<void> {
        const appointment = await this.appointments.findForNotification(event.appointmentId);
        if (appointment?.status !== AppointmentStatus.CONFIRMED || appointment.deletedAt) {
            return;
        }
        const summary = summarize(appointment);
        await this.deliver(appointment, summary, null, [
            AppointmentNotificationsListener.toCustomer(appointment, customerMessages.reminder(summary), { inApp: true }),
        ]);
    }

    @OnEvent(ReviewEvent.CREATED, { async: true })
    async onReviewCreated(event: ReviewCreatedEvent): Promise<void> {
        const appointment = await this.appointments.findForNotification(event.appointmentId);
        if (!appointment) {
            return;
        }
        const summary = summarize(appointment);
        const content = teamMessages.reviewReceived(summary, event.rating);
        await this.deliver(appointment, summary, null, [
            { audience: 'team', inAppUserId: appointment.professional.member.user.id, email: null, whatsapp: null, content },
            ...await this.toManagers(event.businessId, content),
        ]);
    }

    private async toManagers(businessId: string, content: NotificationContent): Promise<Delivery[]> {
        const userIds = await this.members.findManagerUserIds(businessId);
        return userIds.map((userId) => ({ audience: 'team', inAppUserId: userId, email: null, whatsapp: null, content }));
    }

    private async deliver(appointment: AppointmentEntity, summary: AppointmentSummary, actorUserId: string | null, candidates: Delivery[]): Promise<void> {
        const notifiedUsers = new Set<string>(actorUserId ? [actorUserId] : []);
        const emailed = new Set<string>();
        const texted = new Set<string>();
        const inApp: Delivery[] = [];
        const emails: Delivery[] = [];
        const whatsapps: Delivery[] = [];

        for (const delivery of candidates) {
            if (delivery.audience === 'team' && delivery.inAppUserId === actorUserId) {
                continue;
            }
            if (delivery.inAppUserId && !notifiedUsers.has(delivery.inAppUserId)) {
                notifiedUsers.add(delivery.inAppUserId);
                inApp.push(delivery);
            }
            if (delivery.email && !emailed.has(delivery.email.address)) {
                emailed.add(delivery.email.address);
                emails.push(delivery);
            }
            if (delivery.whatsapp && !texted.has(delivery.whatsapp)) {
                texted.add(delivery.whatsapp);
                whatsapps.push(delivery);
            }
        }

        await this.notifications.createMany(inApp.map((delivery) => ({
            userId: delivery.inAppUserId!,
            ...delivery.content,
            businessId: appointment.customer.business.id,
            appointmentId: appointment.id,
        })));

        for (const { email, content, audience } of emails) {
            this.mail.dispatch(AppointmentMail, {
                to: email!,
                data: { name: email!.name, content, summary, url: AppointmentNotificationsListener.urlFor(appointment, audience) },
            });
        }

        for (const { whatsapp, content } of whatsapps) {
            this.whatsapp.dispatch({ businessId: appointment.customer.business.id, phone: whatsapp!, text: toWhatsAppText(content, summary) });
        }
    }

    private static toCustomer(appointment: AppointmentEntity, content: NotificationContent, { inApp }: { inApp: boolean }): Delivery {
        const { customer } = appointment;
        const address = customer.user?.email ?? customer.email;
        const phone = customer.phone ?? customer.user?.phone ?? null;
        const texts = content.type !== NotificationType.APPOINTMENT_COMPLETED && !customer.whatsappOptedOutAt;
        return {
            audience: 'customer',
            inAppUserId: inApp ? customer.user?.id ?? null : null,
            email: address ? { name: customer.name, address } : null,
            whatsapp: texts ? phone : null,
            content,
        };
    }

    private static toProfessional(professional: ProfessionalEntity, content: NotificationContent): Delivery {
        const { user } = professional.member;
        return { audience: 'team', inAppUserId: user.id, email: { name: user.name, address: user.email }, whatsapp: null, content };
    }

    private static urlFor(appointment: AppointmentEntity, audience: Audience): string {
        if (audience === 'customer') {
            return new URL(`/me/appointments/${appointment.id}`, env.FRONTEND_URL).toString();
        }

        const { business } = appointment.customer;
        const url = new URL(`/b/${business.id}/appointments`, env.FRONTEND_URL);
        url.searchParams.set('date', toLocalDate(appointment.startAt, business.timezone));
        url.searchParams.set('appointment', appointment.id);
        return url.toString();
    }
}
