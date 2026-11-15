import { randomInt } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { createRedisClient } from '../../common/redis/redis-client.js';
import { env } from '../../config/env.config.js';
import { BusinessSubscriptionsService } from '../businesses/index.js';
import { WHATSAPP_MESSAGE_QUEUE, type WhatsAppMessageJob } from './whatsapp-message-queue.js';
import { WhatsAppConnectionsService } from './whatsapp-connections.service.js';

const SLOT_TTL_MS = 60 * 60 * 1000;

const RESERVE_SLOT_SCRIPT = `
local slot = math.max(tonumber(ARGV[1]), tonumber(redis.call('GET', KEYS[1]) or '0') + tonumber(ARGV[2]))
redis.call('SET', KEYS[1], slot, 'PX', ARGV[3])
return slot
`;

@Injectable()
export class WhatsAppDispatcher implements OnModuleDestroy {

    private readonly logger = new Logger(WhatsAppDispatcher.name);

    private readonly redis = createRedisClient();

    constructor(
        @InjectQueue(WHATSAPP_MESSAGE_QUEUE) private readonly queue: Queue<WhatsAppMessageJob>,
        private readonly connections: WhatsAppConnectionsService,
        private readonly subscriptions: BusinessSubscriptionsService,
    ) { }

    async onModuleDestroy(): Promise<void> {
        await this.redis.quit();
    }

    dispatch(message: WhatsAppMessageJob): void {
        this.enqueue(message).catch((error: unknown) => {
            this.logger.error(`Falha ao enfileirar mensagem de WhatsApp do negócio ${message.businessId}.`, error instanceof Error ? error.stack : error);
        });
    }

    private async enqueue(message: WhatsAppMessageJob): Promise<void> {
        if (!await this.subscriptions.hasFullAccess(message.businessId) || !await this.connections.findSendableInstance(message.businessId)) {
            return;
        }
        const now = Date.now();
        const slot = await this.reserveSlot(message.businessId, now);
        await this.queue.add('send', message, { delay: Math.max(0, slot - now) });
    }

    private async reserveSlot(businessId: string, now: number): Promise<number> {
        const gap = randomInt(env.WHATSAPP_MIN_INTERVAL_MS, env.WHATSAPP_MAX_INTERVAL_MS + 1);
        const slot = await this.redis.eval(RESERVE_SLOT_SCRIPT, 1, `whatsapp:next-slot:${businessId}`, now, gap, SLOT_TTL_MS);
        return Number(slot);
    }
}
