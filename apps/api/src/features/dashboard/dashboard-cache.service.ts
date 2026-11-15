import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { createRedisClient } from '../../common/redis/redis-client.js';
import { AppointmentEvent, type AppointmentCreatedEvent } from '../appointments/index.js';
import type { BusinessMembership } from '../businesses/index.js';
import { PaymentEvent, type PaymentChangedEvent } from '../payments/index.js';
import { ReviewEvent, type ReviewCreatedEvent } from '../reviews/index.js';

const ENTRY_TTL_MS = 2 * 60 * 1000;
const VERSION_TTL_MS = 24 * 60 * 60 * 1000;

const versionKey = (businessId: string) => `dashboard:${businessId}:version`;

@Injectable()
export class DashboardCacheService implements OnModuleDestroy {

    private readonly logger = new Logger(DashboardCacheService.name);

    private readonly redis = createRedisClient();

    async onModuleDestroy(): Promise<void> {
        await this.redis.quit();
    }

    async wrap<T>(businessId: string, actor: BusinessMembership, name: string, query: object, compute: () => Promise<T>): Promise<T> {
        const key = await this.entryKey(businessId, actor, name, query);
        if (key) {
            const cached = await this.read<T>(key);
            if (cached !== undefined) {
                return cached;
            }
        }
        const value = await compute();
        if (key) {
            await this.write(key, value);
        }
        return value;
    }

    @OnEvent([AppointmentEvent.CREATED, AppointmentEvent.RESCHEDULED, AppointmentEvent.STATUS_CHANGED], { async: true })
    onAppointmentChanged(event: AppointmentCreatedEvent): Promise<void> {
        return this.invalidate(event.businessId);
    }

    @OnEvent(PaymentEvent.CHANGED, { async: true })
    onPaymentChanged(event: PaymentChangedEvent): Promise<void> {
        return this.invalidate(event.businessId);
    }

    @OnEvent(ReviewEvent.CREATED, { async: true })
    onReviewCreated(event: ReviewCreatedEvent): Promise<void> {
        return this.invalidate(event.businessId);
    }

    private async invalidate(businessId: string): Promise<void> {
        try {
            await this.redis.multi().incr(versionKey(businessId)).pexpire(versionKey(businessId), VERSION_TTL_MS).exec();
        } catch (error) {
            this.logger.warn(`Falha ao invalidar o cache do dashboard de ${businessId}: ${DashboardCacheService.messageOf(error)}`);
        }
    }

    private async entryKey(businessId: string, actor: BusinessMembership, name: string, query: object): Promise<string | null> {
        try {
            const version = (await this.redis.get(versionKey(businessId))) ?? '0';
            const isManager = actor.roles.some((r) => r === BusinessMemberRole.OWNER || r === BusinessMemberRole.ADMIN);
            const audience = isManager ? 'managers' : `member:${actor.id}`;
            const params = Object.entries(query).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b));
            return `dashboard:${businessId}:v${version}:${name}:${audience}:${JSON.stringify(params)}`;
        } catch (error) {
            this.logger.warn(`Falha ao ler a versão do cache do dashboard: ${DashboardCacheService.messageOf(error)}`);
            return null;
        }
    }

    private async read<T>(key: string): Promise<T | undefined> {
        try {
            const value = await this.redis.get(key);
            return value === null ? undefined : JSON.parse(value) as T;
        } catch (error) {
            this.logger.warn(`Falha ao ler o cache do dashboard: ${DashboardCacheService.messageOf(error)}`);
            return undefined;
        }
    }

    private async write(key: string, value: unknown): Promise<void> {
        try {
            await this.redis.set(key, JSON.stringify(value), 'PX', ENTRY_TTL_MS);
        } catch (error) {
            this.logger.warn(`Falha ao gravar o cache do dashboard: ${DashboardCacheService.messageOf(error)}`);
        }
    }

    private static messageOf(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }
}
