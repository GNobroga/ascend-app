import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { SubscriptionEventType } from "../../common/enums/subscription-event-type.enum.js";
import { SubscriptionStatus } from "../../common/enums/subscription-status.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessSubscriptionEntity } from "./business-subscription.entity.js";
import { UserEntity } from "./user.entity.js";

@Entity('business_subscription_events')
@Index(["subscription", "createdAt"])
export class BusinessSubscriptionEventEntity extends BaseEntity {

    @Column({ type: 'varchar', length: 40 })
    type: SubscriptionEventType;

    @Column({ type: 'varchar', length: 20, nullable: true })
    previousStatus: SubscriptionStatus | null;

    @Column({ type: 'varchar', length: 20 })
    newStatus: SubscriptionStatus;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, unknown> | null;

    @ManyToOne(() => BusinessSubscriptionEntity, e => e.events, { nullable: false, onDelete: 'CASCADE' })
    subscription: Relation<BusinessSubscriptionEntity>;

    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
    actorUser: Relation<UserEntity> | null;
}
