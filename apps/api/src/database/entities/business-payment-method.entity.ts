import { Column, Entity, ManyToOne, OneToMany, Index, type Relation } from "typeorm";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { PaymentEntity } from "./payment.entity.js";

/** Forma de pagamento aceita por um negócio. */
@Entity('business_payment_methods')
@Index(["business"])
export class BusinessPaymentMethodEntity extends SoftDeletableEntity {

    /** Nome da forma de pagamento (ex.: Pix, Cartão). */
    @Column({ type: 'varchar', length: 100 })
    name: string;

    /** Descrição da forma de pagamento. */
    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string | null;

    /** Se a forma de pagamento está disponível. */
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    /** Pagamentos feitos com esta forma de pagamento. */
    @OneToMany(() => PaymentEntity, e => e.paymentMethod)
    payments: PaymentEntity[];

    /** Negócio que aceita esta forma de pagamento. */
    @ManyToOne(() => BusinessEntity, e => e.paymentMethods, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;
}
