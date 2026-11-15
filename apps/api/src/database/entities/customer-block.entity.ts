import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { CustomerBlockType } from "../../common/enums/customer-block-type.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessPaymentMethodEntity } from "./business-payment-method.entity.js";
import { CustomerEntity } from "./customer.entity.js";
import { UserEntity } from "./user.entity.js";

/** Bloqueio de um cliente para agendar online; o histórico fica guardado. */
@Entity('customer_blocks')
@Index(["customer", "createdAt"])
@Index('IDX_customer_blocks_open', ["customer"], { unique: true, where: `"liftedAt" IS NULL` })
export class CustomerBlockEntity extends BaseEntity {

    /** `temporary` vence em `until`; `fee` dura até a taxa ser paga. */
    @Column({ type: 'varchar', length: 20 })
    type: CustomerBlockType;

    /** Motivo do bloqueio. */
    @Column({ type: 'text', nullable: true })
    reason: string | null;

    /** Fim do bloqueio temporário; `null` no bloqueio por taxa. */
    @Column({ type: 'timestamptz', nullable: true })
    until: Date | null;

    /** Taxa para desbloquear, copiada da configuração do negócio no momento do bloqueio. */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        nullable: true,
        transformer: {
            to: (value: number | null) => value,
            from: (value: string | null) => (value === null ? null : Number(value)),
        },
    })
    feeAmount: number | null;

    /** Quando a taxa foi paga. */
    @Column({ type: 'timestamptz', nullable: true })
    feePaidAt: Date | null;

    /** Observações sobre o pagamento da taxa. */
    @Column({ type: 'text', nullable: true })
    feePaymentNotes: string | null;

    /** Quando o bloqueio foi encerrado (taxa paga, desbloqueio manual ou substituído por outro). */
    @Column({ type: 'timestamptz', nullable: true })
    liftedAt: Date | null;

    /** Cliente bloqueado. */
    @ManyToOne(() => CustomerEntity, e => e.blocks, { nullable: false, onDelete: 'CASCADE' })
    customer: Relation<CustomerEntity>;

    /** Forma de pagamento da taxa. */
    @ManyToOne(() => BusinessPaymentMethodEntity, { nullable: true })
    feePaymentMethod: Relation<BusinessPaymentMethodEntity> | null;

    /** Quem bloqueou. */
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
    blockedByUser: Relation<UserEntity> | null;

    /** Quem encerrou o bloqueio. */
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
    liftedByUser: Relation<UserEntity> | null;
}
