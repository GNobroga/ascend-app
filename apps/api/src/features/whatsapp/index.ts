import { EvolutionWebhookController } from './evolution-webhook.controller.js';
import { WhatsAppConnectionProcessor } from './whatsapp-connection.processor.js';
import { WhatsAppConnectionsController } from './whatsapp-connections.controller.js';
import { WhatsAppConnectionsService } from './whatsapp-connections.service.js';
import { WhatsAppDispatcher } from './whatsapp-dispatcher.service.js';
import { WhatsAppMessageProcessor } from './whatsapp-message.processor.js';

export { WhatsAppConnectionsService } from './whatsapp-connections.service.js';
export { WhatsAppDispatcher } from './whatsapp-dispatcher.service.js';
export { whatsappConnectionQueueOptions } from './whatsapp-connection-queue.js';
export { whatsappMessageQueueOptions } from './whatsapp-message-queue.js';
export { WhatsAppEvent, type WhatsAppDisconnectedEvent } from './whatsapp-events.js';

export const whatsappControllers = [WhatsAppConnectionsController, EvolutionWebhookController];
export const whatsappProviders = [WhatsAppConnectionsService, WhatsAppConnectionProcessor, WhatsAppDispatcher, WhatsAppMessageProcessor];
