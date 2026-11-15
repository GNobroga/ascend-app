import { Injectable } from '@nestjs/common';
import type { Mailable, MailTemplateContent } from '@nestjs/mail';
import { BusinessMemberRole } from '../../../common/enums/business-member-role.enum.js';

export interface BusinessInvitationMailData {
    businessName: string;
    inviterName: string;
    roles: BusinessMemberRole[];
    url: string;
    ttlDays: number;
}

const ROLE_LABELS: Record<BusinessMemberRole, string> = {
    [BusinessMemberRole.OWNER]: 'proprietário',
    [BusinessMemberRole.ADMIN]: 'administrador',
    [BusinessMemberRole.PROFESSIONAL]: 'profissional',
};

const listFormat = new Intl.ListFormat('pt-BR', { type: 'conjunction' });

@Injectable()
export class BusinessInvitationMail implements Mailable<BusinessInvitationMailData> {
    render(data: BusinessInvitationMailData): MailTemplateContent {
        return {
            subject: `Convite para a equipe de ${data.businessName}`,
            template: 'business-invitation',
            context: { ...data, roles: listFormat.format(data.roles.map((r) => ROLE_LABELS[r])), buttonLabel: 'Ver convite' },
        };
    }
}
