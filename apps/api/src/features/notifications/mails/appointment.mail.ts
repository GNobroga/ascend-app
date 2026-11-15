import { Injectable } from '@nestjs/common';
import type { Mailable, MailTemplateContent } from '@nestjs/mail';
import type { AppointmentSummary, NotificationContent } from '../appointment-messages.js';

export interface AppointmentMailData {
    name: string;
    content: NotificationContent;
    summary: AppointmentSummary;
    url: string;
}

@Injectable()
export class AppointmentMail implements Mailable<AppointmentMailData> {
    render({ name, content, summary, url }: AppointmentMailData): MailTemplateContent {
        return {
            subject: `${content.title} · ${summary.businessName}`,
            template: 'appointment',
            context: { ...summary, name, message: content.message, url, buttonLabel: 'Ver agendamento' },
        };
    }
}
