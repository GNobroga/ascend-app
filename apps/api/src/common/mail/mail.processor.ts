import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Mailer } from '@nestjs/mail';
import type { Job } from 'bullmq';
import { env } from '../../config/env.config.js';
import { MAIL_QUEUE, type MailJob } from './mail-queue.js';

@Processor(MAIL_QUEUE, {
    concurrency: 1,
    limiter: { max: env.MAIL_RATE_LIMIT_MAX, duration: env.MAIL_RATE_LIMIT_DURATION_MS },
})
export class MailProcessor extends WorkerHost {

    private readonly logger = new Logger(MailProcessor.name);

    constructor(private readonly mailer: Mailer) {
        super();
    }

    async process(job: Job<MailJob>): Promise<void> {
        const { to, subject, html, text } = job.data;
        await this.mailer.send({ to, subject, html, text });
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<MailJob> | undefined, error: Error): void {
        if (!job) {
            return;
        }
        const attempts = job.opts.attempts ?? 1;
        if (job.attemptsMade >= attempts) {
            this.logger.error(`Falha definitiva ao enviar ${job.name} (job ${job.id}) após ${attempts} tentativas.`, error.stack);
            return;
        }
        this.logger.warn(`Falha ao enviar ${job.name} (job ${job.id}), tentativa ${job.attemptsMade} de ${attempts}: ${error.message}`);
    }
}
