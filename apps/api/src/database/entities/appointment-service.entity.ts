import { Check, Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { BaseEntity } from "./base/base.entity.js";
import { AppointmentEntity } from "./appointment.entity.js";
import { ServiceEntity } from "./service.entity.js";

/** Serviço incluído em um agendamento, com preço e duração no momento da reserva. */
@Entity('appointment_services')
@Index(["appointment", "service"], { unique: true })
@Index(["service"])
@Check(`"commissionPercent" BETWEEN 0 AND 100`)
export class AppointmentServiceEntity extends BaseEntity {

    /** Preço de tabela do serviço no momento da reserva. */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    listPrice: number;

    /** Preço cobrado pelo serviço neste agendamento (rateado quando é de um pacote). */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    price: number;

    /** Duração do serviço neste agendamento, em minutos. */
    @Column({ type: 'int' })
    durationMinutes: number;

    /** Percentual de comissão aplicado neste serviço (0 a 100). */
    @Column({
        type: 'numeric',
        precision: 5,
        scale: 2,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    commissionPercent: number;

    /** Valor da comissão do profissional neste serviço. */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    commissionAmount: number;

    /** Agendamento que inclui o serviço. */
    @ManyToOne(() => AppointmentEntity, e => e.services, { nullable: false, onDelete: 'CASCADE' })
    appointment: Relation<AppointmentEntity>;

    /** Serviço agendado. */
    @ManyToOne(() => ServiceEntity, e => e.appointments, { nullable: false })
    service: Relation<ServiceEntity>;
}
