import { Entity, Index, ManyToOne, type Relation } from "typeorm";
import { BaseEntity } from "./base/base.entity.js";
import { ProfessionalEntity } from "./professional.entity.js";
import { SpecialtyEntity } from "./specialty.entity.js";

/** Especialidade de um profissional. */
@Entity('professional_specialties')
@Index(["professional", "specialty"], { unique: true })
@Index(["specialty"])
export class ProfessionalSpecialtyEntity extends BaseEntity {

    /** Profissional que possui a especialidade. */
    @ManyToOne(() => ProfessionalEntity, e => e.specialties, { nullable: false, onDelete: 'CASCADE' })
    professional: Relation<ProfessionalEntity>;

    /** Especialidade do profissional. */
    @ManyToOne(() => SpecialtyEntity, e => e.professionals, { nullable: false, onDelete: 'CASCADE' })
    specialty: Relation<SpecialtyEntity>;
}
