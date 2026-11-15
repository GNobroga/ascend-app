import { Injectable } from '@nestjs/common';
import type { Mailable, MailTemplateContent } from '@nestjs/mail';

export interface PasswordResetMailData {
    name: string;
    url: string;
    ttlMinutes: number;
}


@Injectable()
export class PasswordResetMail implements Mailable<PasswordResetMailData> {
    render(data: PasswordResetMailData): MailTemplateContent {
        return {
            subject: 'Redefinição de senha',
            template: 'password-reset',
            context: { ...data, buttonLabel: 'Redefinir senha' },
        };
    }
}
