import type { RegisterQueueOptions } from '@nestjs/bullmq';

export const WHATSAPP_MESSAGE_QUEUE = 'whatsapp-message';

const MINUTE_MS = 60 * 1000;
const WEEK_SECONDS = 7 * 24 * 60 * 60;

export interface WhatsAppMessageJob {
    businessId: string;
    phone: string;
    text: string;
}

export const whatsappMessageQueueOptions: RegisterQueueOptions = {
    name: WHATSAPP_MESSAGE_QUEUE,
    defaultJobOptions: {
        attempts: 4,
        backoff: { type: 'exponential', delay: MINUTE_MS },
        removeOnComplete: true,
        removeOnFail: { age: WEEK_SECONDS },
    },
};
