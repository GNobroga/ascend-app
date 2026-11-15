import { Check, Column, Entity, Exclusion, Index, ManyToOne, OneToMany, type Relation } from "typeorm";
import { AppointmentOrigin } from "../../common/enums/appointment-origin.enum.js";
import { AppointmentStatus } from "../../common/enums/appointment-status.enum.js";
import { CommissionMode } from "../../common/enums/commission-mode.enum.js";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { AppointmentServiceEntity } from "./appointment-service.entity.js";
import { AppointmentStatusHistoryEntity } from "./appointment-status-history.entity.js";
import { CustomerEntity } from "./customer.entity.js";
import { PackageEntity } from "./package.entity.js";
import { PaymentEntity } from "./payment.entity.js";
import { ProfessionalEntity } from "./professional.entity.js";
import { ReviewEntity } from "./review.entity.js";

/** Agendamento de um cliente. */
@Entity('appointments')
@Index(["customer", "startAt"])
@Index(["package"])
@Index(["professional", "startAt"])
@Index('IDX_appointments_reminder_pending', ["startAt"], { where: `"reminderSentAt" IS NULL AND status = 'confirmed' AND "deletedAt" IS NULL` })
@Check(`"commissionPercent" IS NULL OR "commissionPercent" BETWEEN 0 AND 100`)
// Garante no banco que o mesmo profissional não tenha dois agendamentos sobrepostos, mesmo com reservas simultâneas.
@Exclusion('EXCL_appointments_professional_period', `USING gist ("professionalId" WITH =, tstzrange("startAt", "endAt") WITH &&) WHERE (status NOT IN ('cancelled', 'no_show') AND "deletedAt" IS NULL)`)
export class AppointmentEntity extends SoftDeletableEntity {

    /** Início do agendamento. */
    @Column({ type: 'timestamptz' })
    startAt: Date;

    /** Fim do agendamento. */
    @Column({ type: 'timestamptz' })
    endAt: Date;

    /** Situação do agendamento. */
    @Column({ type: 'varchar', length: 20, default: AppointmentStatus.PENDING })
    status: AppointmentStatus;

    /** Quem criou: o cliente pela página pública ou a equipe pelo painel; `null` nos antigos sem origem inferida. */
    @Column({ type: 'varchar', length: 20, nullable: true })
    origin: AppointmentOrigin | null;

    /** Observações do cliente. */
    @Column({ type: 'text', nullable: true })
    customerNotes: string | null;

    /** Observações internas do negócio. */
    @Column({ type: 'text', nullable: true })
    internalNotes: string | null;

    /** Motivo do cancelamento. */
    @Column({ type: 'text', nullable: true })
    cancellationReason: string | null;

    /** Data do cancelamento. */
    @Column({ type: 'timestamptz', nullable: true })
    cancelledAt: Date | null;

    /** Quando o lembrete foi enviado, ou dispensado por o agendamento já nascer dentro da janela. */
    @Column({ type: 'timestamptz', nullable: true })
    reminderSentAt: Date | null;

    /** Valor total cobrado do cliente. */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    totalPrice: number;

    /** Modo de comissão do pacote no momento da reserva; `null` sem pacote. */
    @Column({ type: 'varchar', length: 20, nullable: true })
    commissionMode: CommissionMode | null;

    /** Percentual de comissão sobre o pacote (0 a 100); usado só no modo `package`. */
    @Column({
        type: 'numeric',
        precision: 5,
        scale: 2,
        nullable: true,
        transformer: {
            to: (value: number | null) => value,
            from: (value: string | null) => (value === null ? null : Number(value)),
        },
    })
    commissionPercent: number | null;

    /** Valor da comissão sobre o pacote; `0` fora do modo `package`. */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        default: 0,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    commissionAmount: number;

    /** Pagamentos do agendamento. */
    @OneToMany(() => PaymentEntity, e => e.appointment)
    payments: PaymentEntity[];

    /** Avaliação do agendamento; no máximo uma. */
    @OneToMany(() => ReviewEntity, e => e.appointment)
    reviews: ReviewEntity[];

    /** Histórico de mudanças de status. */
    @OneToMany(() => AppointmentStatusHistoryEntity, e => e.appointment)
    statusHistory: AppointmentStatusHistoryEntity[];

    /** Serviços do agendamento. */
    @OneToMany(() => AppointmentServiceEntity, e => e.appointment)
    services: AppointmentServiceEntity[];

    /** Pacote agendado; opcional. */
    @ManyToOne(() => PackageEntity, e => e.appointments, { nullable: true, onDelete: 'SET NULL' })
    package: Relation<PackageEntity> | null;

    /** Profissional que atende. */
    @ManyToOne(() => ProfessionalEntity, e => e.appointments, { nullable: false })
    professional: Relation<ProfessionalEntity>;

    /** Cliente do agendamento. */
    @ManyToOne(() => CustomerEntity, e => e.appointments, { nullable: false, onDelete: 'CASCADE' })
    customer: Relation<CustomerEntity>;
}
