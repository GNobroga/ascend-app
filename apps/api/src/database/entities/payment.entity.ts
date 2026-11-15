import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { PaymentStatus } from "../../common/enums/payment-status.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { AppointmentEntity } from "./appointment.entity.js";
import { BusinessPaymentMethodEntity } from "./business-payment-method.entity.js";

/** Pagamento de um agendamento. */
@Entity('payments')
@Index(["appointment"])
@Index(["paymentMethod"])
@Index(["paidAt"])
export class PaymentEntity extends BaseEntity {

    /** Valor do pagamento. */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    amount: number;

    /** Situação do pagamento. */
    @Column({ type: 'varchar', length: 20, default: PaymentStatus.PENDING })
    status: PaymentStatus;

    /** Observações sobre o pagamento. */
    @Column({ type: 'text', nullable: true })
    notes: string | null;

    /** Quando o dinheiro foi recebido; por padrão, o momento do lançamento. */
    @Column({ type: 'timestamptz', default: () => 'now()' })
    paidAt: Date;

    /** Agendamento pago. */
    @ManyToOne(() => AppointmentEntity, e => e.payments, { nullable: false })
    appointment: Relation<AppointmentEntity>;

    /** Forma de pagamento usada. */
    @ManyToOne(() => BusinessPaymentMethodEntity, e => e.payments, { nullable: false })
    paymentMethod: Relation<BusinessPaymentMethodEntity>;
}
