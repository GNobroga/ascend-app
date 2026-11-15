import { randomInt } from 'node:crypto';
import { HttpStatus, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { UnrecoverableError, type Job } from 'bullmq';
import { WhatsAppConnectionStatus } from '../../common/enums/whatsapp-connection-status.enum.js';
import { WhatsAppProvider, WhatsAppProviderError } from '../../common/whatsapp/whatsapp-provider.js';
import { WHATSAPP_MESSAGE_QUEUE, type WhatsAppMessageJob } from './whatsapp-message-queue.js';
import { WhatsAppConnectionsService } from './whatsapp-connections.service.js';

const MIN_TYPING_MS = 1_500;
const MAX_TYPING_MS = 3_500;

const isClientError = (error: unknown): boolean =>
    error instanceof WhatsAppProviderError
    && error.status !== null
    && error.status >= HttpStatus.BAD_REQUEST
    && error.status < HttpStatus.INTERNAL_SERVER_ERROR;

@Processor(WHATSAPP_MESSAGE_QUEUE, { concurrency: 5 })
export class WhatsAppMessageProcessor extends WorkerHost {

    private readonly logger = new Logger(WhatsAppMessageProcessor.name);

    constructor(
        private readonly connections: WhatsAppConnectionsService,
        private readonly provider: WhatsAppProvider,
    ) {
        super();
    }

    async process(job: Job<WhatsAppMessageJob>): Promise<void> {
        const { businessId, phone, text } = job.data;
        const instanceName = await this.connections.findSendableInstance(businessId);
        if (!instanceName) {
            return;
        }
        const info = await this.provider.getConnection(instanceName);
        if (info?.status !== WhatsAppConnectionStatus.CONNECTED) {
            this.logger.warn(`WhatsApp do negócio ${businessId} não está conectado; mensagem do job ${job.id} descartada.`);
            return;
        }
        try {
            await this.provider.sendText(instanceName, phone, text, { typingMs: randomInt(MIN_TYPING_MS, MAX_TYPING_MS + 1) });
        } catch (error) {
            throw isClientError(error) ? new UnrecoverableError((error as Error).message) : error;
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job<WhatsAppMessageJob> | undefined, error: Error): void {
        if (!job) {
            return;
        }
        const attempts = job.opts.attempts ?? 1;
        if (error instanceof UnrecoverableError || job.attemptsMade >= attempts) {
            this.logger.error(`Falha definitiva ao enviar WhatsApp (job ${job.id}) após ${job.attemptsMade} tentativa(s).`, error.stack);
            return;
        }
        this.logger.warn(`Falha ao enviar WhatsApp (job ${job.id}), tentativa ${job.attemptsMade} de ${attempts}: ${error.message}`);
    }
}
