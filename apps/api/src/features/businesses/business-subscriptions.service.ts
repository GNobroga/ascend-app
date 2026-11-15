import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type EntityManager } from 'typeorm';
import { SubscriptionEventType } from '../../common/enums/subscription-event-type.enum.js';
import { SubscriptionStatus } from '../../common/enums/subscription-status.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { env } from '../../config/env.config.js';
import { BusinessSubscriptionEventEntity } from '../../database/entities/business-subscription-event.entity.js';
import { BusinessSubscriptionEntity } from '../../database/entities/business-subscription.entity.js';

export const TRIAL_DAYS = 7;
export const ACTIVATION_BONUS_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionAccess = 'full' | 'restricted';

@Injectable()
export class BusinessSubscriptionsService {

    constructor(
        @InjectRepository(BusinessSubscriptionEntity) private readonly subscriptions: Repository<BusinessSubscriptionEntity>,
    ) { }

    async startTrial(manager: EntityManager, businessId: string, actorUserId: string): Promise<void> {
        const subscription = await manager.save(manager.create(BusinessSubscriptionEntity, {
            business: { id: businessId },
            status: SubscriptionStatus.TRIALING,
            trialEndsAt: new Date(Date.now() + TRIAL_DAYS * DAY_MS),
        }));
        await manager.save(manager.create(BusinessSubscriptionEventEntity, {
            subscription,
            type: SubscriptionEventType.TRIAL_STARTED,
            previousStatus: null,
            newStatus: subscription.status,
            metadata: { trialEndsAt: subscription.trialEndsAt.toISOString() },
            actorUser: { id: actorUserId },
        }));
    }

    getByBusiness(businessId: string): Promise<BusinessSubscriptionEntity> {
        return this.subscriptions.findOneByOrFail({ business: { id: businessId } });
    }

    async hasFullAccess(businessId: string): Promise<boolean> {
        return BusinessSubscriptionsService.accessOf(await this.getByBusiness(businessId)) === 'full';
    }

    async ensureFullAccess(businessId: string): Promise<void> {
        if (!await this.hasFullAccess(businessId)) {
            throw new AppException(ErrorCode.SUBSCRIPTION_RESTRICTED, HttpStatus.PAYMENT_REQUIRED, 'A assinatura do negócio não está ativa.');
        }
    }

    async grantActivationBonus(businessId: string): Promise<void> {
        await this.subscriptions.manager.transaction(async (manager) => {
            const { raw } = await manager.createQueryBuilder(BusinessSubscriptionEntity, 'subscription')
                .update()
                .set({
                    trialEndsAt: () => `"trialEndsAt" + interval '${ACTIVATION_BONUS_DAYS} days'`,
                    activationBonusGrantedAt: () => 'now()',
                })
                .where('"businessId" = :businessId', { businessId })
                .andWhere('status = :status', { status: SubscriptionStatus.TRIALING })
                .andWhere('"activationBonusGrantedAt" IS NULL')
                .andWhere('"trialEndsAt" > now()')
                .returning(['id', 'trialEndsAt'])
                .execute();

            const granted = (raw as { id: string; trialEndsAt: Date | string }[])?.[0];
            if (!granted) {
                return;
            }
            const trialEndsAt = new Date(granted.trialEndsAt);
            await manager.save(manager.create(BusinessSubscriptionEventEntity, {
                subscription: { id: granted.id },
                type: SubscriptionEventType.ACTIVATION_BONUS_GRANTED,
                previousStatus: SubscriptionStatus.TRIALING,
                newStatus: SubscriptionStatus.TRIALING,
                metadata: {
                    previousTrialEndsAt: new Date(trialEndsAt.getTime() - ACTIVATION_BONUS_DAYS * DAY_MS).toISOString(),
                    trialEndsAt: trialEndsAt.toISOString(),
                },
                actorUser: null,
            }));
        });
    }

    static accessOf(subscription: BusinessSubscriptionEntity, now = new Date()): SubscriptionAccess {
        const trialExpired = subscription.status === SubscriptionStatus.TRIALING && subscription.trialEndsAt <= now;
        return trialExpired && env.BILLING_ENFORCEMENT_ENABLED ? 'restricted' : 'full';
    }
}
