import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '../../common/enums/notification-type.enum.js';
import { BusinessesService, BusinessMembersService } from '../businesses/index.js';
import { WhatsAppEvent, type WhatsAppDisconnectedEvent } from '../whatsapp/index.js';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class WhatsAppNotificationsListener {

    constructor(
        private readonly businesses: BusinessesService,
        private readonly members: BusinessMembersService,
        private readonly notifications: NotificationsService,
    ) { }

    @OnEvent(WhatsAppEvent.DISCONNECTED, { async: true })
    async onDisconnected(event: WhatsAppDisconnectedEvent): Promise<void> {
        const business = await this.businesses.getById(event.businessId);
        const userIds = await this.members.findManagerUserIds(event.businessId);
        await this.notifications.createMany(userIds.map((userId) => ({
            userId,
            type: NotificationType.WHATSAPP_DISCONNECTED,
            title: 'WhatsApp desconectado',
            message: `O WhatsApp de ${business.name} foi desconectado e as mensagens aos clientes pararam de sair. Conecte de novo lendo o QR code.`,
            businessId: event.businessId,
            appointmentId: null,
        })));
    }
}
