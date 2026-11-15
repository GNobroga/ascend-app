import { Column, Entity, JoinColumn, OneToOne, type Relation } from "typeorm";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessEntity } from "./business.entity.js";

/** Configurações de agendamento de um negócio. */
@Entity('business_settings')
export class BusinessSettingEntity extends BaseEntity {

    /** Antecedência mínima, em horas, para cancelar. */
    @Column({ type: 'int', default: 24 })
    cancellationLimitHours: number;

    /** Antecedência mínima, em minutos, para agendar. */
    @Column({ type: 'int', default: 60 })
    minimumAdvanceBookingMinutes: number;

    /** Antecedência máxima, em dias, para agendar. */
    @Column({ type: 'int', default: 30 })
    maximumAdvanceBookingDays: number;

    /** Intervalo, em minutos, entre os horários disponíveis. */
    @Column({ type: 'int', default: 30 })
    slotIntervalMinutes: number;

    /** Intervalo, em minutos, livre entre um atendimento e outro do mesmo profissional. */
    @Column({ type: 'int', default: 0 })
    bufferMinutes: number;

    /** Taxa, em reais, que o cliente paga para sair de um bloqueio por taxa. */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        default: 0,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    unblockFee: number;

    /** Agendamentos feitos pelo cliente nascem confirmados; desligado, nascem pendentes. */
    @Column({ type: 'boolean', default: true })
    autoConfirmOnlineBookings: boolean;

    /** Antecedência, em horas, do lembrete ao cliente; `0` desliga. */
    @Column({ type: 'int', default: 24 })
    reminderHoursBefore: number;

    /** Negócio dono das configurações. */
    @OneToOne(() => BusinessEntity, e => e.setting, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn()
    business: Relation<BusinessEntity>;
}
