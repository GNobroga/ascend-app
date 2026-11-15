import type { RegisterQueueOptions } from '@nestjs/bullmq';

export const MAIL_QUEUE = 'mail';

const MINUTE_MS = 60 * 1000;
const WEEK_SECONDS = 7 * 24 * 60 * 60;

export interface MailJob {
    to: { name?: string; address: string }[];
    subject: string;
    html?: string;
    text?: string;
}


export const mailQueueOptions: RegisterQueueOptions = {
    name: MAIL_QUEUE,
    defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: MINUTE_MS },
        removeOnComplete: true,
        removeOnFail: { age: WEEK_SECONDS },
    },
};
