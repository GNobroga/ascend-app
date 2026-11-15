import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { WHATSAPP_CONNECTION_QUEUE, type ConnectionCheckJob } from './whatsapp-connection-queue.js';
import { WhatsAppConnectionsService } from './whatsapp-connections.service.js';

@Processor(WHATSAPP_CONNECTION_QUEUE)
export class WhatsAppConnectionProcessor extends WorkerHost {

    constructor(private readonly connections: WhatsAppConnectionsService) {
        super();
    }

    async process(job: Job<ConnectionCheckJob>): Promise<void> {
        await this.connections.confirmDisconnection(job.data.connectionId);
    }
}
