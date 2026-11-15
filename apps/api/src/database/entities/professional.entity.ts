import { Check, Column, Entity, JoinColumn, OneToMany, OneToOne, type Relation } from "typeorm";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { AppointmentEntity } from "./appointment.entity.js";
import { BusinessMemberEntity } from "./business-member.entity.js";
import { ProfessionalPackageEntity } from "./professional-package.entity.js";
import { ProfessionalServiceEntity } from "./professional-service.entity.js";
import { ProfessionalSpecialtyEntity } from "./professional-specialty.entity.js";
import { ProfessionalTimeOffEntity } from "./professional-time-off.entity.js";
import { ReviewEntity } from "./review.entity.js";
import { ProfessionalWorkingHoursEntity } from "./professional-working-hours.entity.js";

/** Profissional que atende em um negócio. */
@Entity('professionals')
@Check(`"commissionPercent" BETWEEN 0 AND 100`)
export class ProfessionalEntity extends SoftDeletableEntity {

    /** Nome exibido do profissional. */
    @Column({ type: 'varchar', length: 255 })
    displayName: string;

    /** Biografia do profissional. */
    @Column({ type: 'text', nullable: true })
    bio: string | null;

    /** Key da foto do profissional no storage. */
    @Column({ type: 'varchar', length: 2048, nullable: true })
    photoKey: string | null;

    /** Percentual de comissão padrão do profissional (0 a 100). */
    @Column({
        type: 'numeric',
        precision: 5,
        scale: 2,
        default: 0,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    commissionPercent: number;

    /** Membro do negócio que corresponde ao profissional. */
    @OneToOne(() => BusinessMemberEntity, e => e.professional, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn()
    member: Relation<BusinessMemberEntity>;

    /** Serviços que o profissional executa. */
    @OneToMany(() => ProfessionalServiceEntity, e => e.professional)
    services: ProfessionalServiceEntity[];

    /** Avaliações do profissional. */
    @OneToMany(() => ReviewEntity, e => e.professional)
    reviews: ReviewEntity[];

    /** Ausências do profissional. */
    @OneToMany(() => ProfessionalTimeOffEntity, e => e.professional)
    timeOffs: ProfessionalTimeOffEntity[];

    /** Especialidades do profissional. */
    @OneToMany(() => ProfessionalSpecialtyEntity, e => e.professional)
    specialties: ProfessionalSpecialtyEntity[];

    /** Agendamentos do profissional. */
    @OneToMany(() => AppointmentEntity, e => e.professional)
    appointments: AppointmentEntity[];

    /** Pacotes que o profissional executa. */
    @OneToMany(() => ProfessionalPackageEntity, e => e.professional)
    packages: ProfessionalPackageEntity[];

    /** Horários de trabalho do profissional. */
    @OneToMany(() => ProfessionalWorkingHoursEntity, e => e.professional)
    workingHours: ProfessionalWorkingHoursEntity[];
}
