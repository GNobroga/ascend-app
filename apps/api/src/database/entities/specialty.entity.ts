import { Column, Entity, Index, ManyToOne, OneToMany, type Relation } from "typeorm";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { ProfessionalSpecialtyEntity } from "./professional-specialty.entity.js";

/** Especialidade que um profissional pode ter. */
@Entity('specialties')
@Index(["business", "name"], { unique: true })
export class SpecialtyEntity extends BaseEntity {

    /** Nome da especialidade. */
    @Column({ type: 'varchar', length: 100 })
    name: string;

    /** Descrição da especialidade. */
    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string | null;

    /** Negócio dono da especialidade. */
    @ManyToOne(() => BusinessEntity, e => e.specialties, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;

    /** Profissionais com a especialidade. */
    @OneToMany(() => ProfessionalSpecialtyEntity, e => e.specialty)
    professionals: ProfessionalSpecialtyEntity[];
}
