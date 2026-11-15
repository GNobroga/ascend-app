import type { RegisterQueueOptions } from '@nestjs/bullmq';

export const WHATSAPP_CONNECTION_QUEUE = 'whatsapp-connection';

export const DISCONNECTION_GRACE_MS = 2 * 60 * 1000;

const WEEK_SECONDS = 7 * 24 * 60 * 60;

export interface ConnectionCheckJob {
    connectionId: string;
}

export const whatsappConnectionQueueOptions: RegisterQueueOptions = {
    name: WHATSAPP_CONNECTION_QUEUE,
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: true,
        removeOnFail: { age: WEEK_SECONDS },
    },
};
