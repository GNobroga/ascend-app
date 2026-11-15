import { Column, Entity, JoinColumn, OneToMany, OneToOne, type Relation } from "typeorm";
import { SubscriptionStatus } from "../../common/enums/subscription-status.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessSubscriptionEventEntity } from "./business-subscription-event.entity.js";
import { BusinessEntity } from "./business.entity.js";

@Entity('business_subscriptions')
export class BusinessSubscriptionEntity extends BaseEntity {

    @Column({ type: 'varchar', length: 20, default: SubscriptionStatus.TRIALING })
    status: SubscriptionStatus;

    @Column({ type: 'timestamptz' })
    trialEndsAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    activationBonusGrantedAt: Date | null;

    @OneToOne(() => BusinessEntity, e => e.subscription, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn()
    business: Relation<BusinessEntity>;

    @OneToMany(() => BusinessSubscriptionEventEntity, e => e.subscription)
    events: BusinessSubscriptionEventEntity[];
}
