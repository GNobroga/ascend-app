import { Injectable } from '@nestjs/common';
import type { Mailable, MailTemplateContent } from '@nestjs/mail';

export interface EmailVerificationMailData {
    name: string;
    url: string;
    ttlHours: number;
}

@Injectable()
export class EmailVerificationMail implements Mailable<EmailVerificationMailData> {
    render(data: EmailVerificationMailData): MailTemplateContent {
        return {
            subject: 'Confirme seu e-mail',
            template: 'email-verification',
            context: { ...data, buttonLabel: 'Confirmar e-mail' },
        };
    }
}
