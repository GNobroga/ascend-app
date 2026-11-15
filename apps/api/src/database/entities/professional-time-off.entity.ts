import { Check, Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { ProfessionalTimeOffType } from "../../common/enums/professional-time-off-type.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { ProfessionalEntity } from "./professional.entity.js";

/** Período em que um profissional não atende. */
@Entity('professional_time_offs')
@Index(["professional"])
export class ProfessionalTimeOffEntity extends BaseEntity {

    /** Início da ausência. */
    @Column({ type: 'timestamptz' })
    startAt: Date;

    /** Fim da ausência. */
    @Column({ type: 'timestamptz' })
    endAt: Date;

    /** Motivo da ausência. */
    @Column({ type: 'text', nullable: true })
    reason: string | null;

    /** Tipo da ausência. */
    @Column({ type: 'varchar', length: 20 })
    type: ProfessionalTimeOffType;

    /** Profissional ausente. */
    @ManyToOne(() => ProfessionalEntity, e => e.timeOffs, { nullable: false, onDelete: 'CASCADE' })
    professional: Relation<ProfessionalEntity>;
}
