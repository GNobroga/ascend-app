import { Check, Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { ReviewStatus } from "../../common/enums/review-status.enum.js";
import { ReviewType } from "../../common/enums/review-type.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { AppointmentEntity } from "./appointment.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { CustomerEntity } from "./customer.entity.js";
import { ProfessionalEntity } from "./professional.entity.js";

/** Avaliação feita por um cliente; a mais recente de cada alvo é a exibida. */
@Entity('reviews')
@Index(["business", "type", "status"])
@Index(["business", "createdAt"])
@Index(["professional"])
@Index(["appointment"], { unique: true })
@Index(["customer"])
@Check(`"rating" BETWEEN 1 AND 5`)
@Check(`("type" = 'business' AND "professionalId" IS NULL AND "appointmentId" IS NULL) OR ("type" = 'professional' AND "professionalId" IS NOT NULL AND "appointmentId" IS NULL) OR ("type" = 'appointment' AND "appointmentId" IS NOT NULL)`)
export class ReviewEntity extends BaseEntity {

    /** Alvo da avaliação: negócio, profissional ou agendamento. */
    @Column({ type: 'varchar', length: 20 })
    type: ReviewType;

    /** Nota da avaliação, de 1 a 5. */
    @Column({ type: 'smallint' })
    rating: number;

    /** Comentário do cliente. */
    @Column({ type: 'text', nullable: true })
    comment: string | null;

    /** Situação da avaliação. */
    @Column({ type: 'varchar', length: 20, default: ReviewStatus.PUBLISHED })
    status: ReviewStatus;

    /** Resposta pública do negócio. */
    @Column({ type: 'text', nullable: true })
    reply: string | null;

    /** Quando a resposta foi escrita ou editada pela última vez. */
    @Column({ type: 'timestamptz', nullable: true })
    repliedAt: Date | null;

    /** Negócio avaliado. */
    @ManyToOne(() => BusinessEntity, e => e.reviews, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;

    /** Profissional avaliado; opcional. */
    @ManyToOne(() => ProfessionalEntity, e => e.reviews, { nullable: true })
    professional: Relation<ProfessionalEntity> | null;

    /** Cliente que fez a avaliação. */
    @ManyToOne(() => CustomerEntity, e => e.reviews, { nullable: false })
    customer: Relation<CustomerEntity>;

    /** Agendamento avaliado; opcional. */
    @ManyToOne(() => AppointmentEntity, e => e.reviews, { nullable: true })
    appointment: Relation<AppointmentEntity> | null;
}
