import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { Weekday } from "../../common/enums/weekday.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { ProfessionalEntity } from "./professional.entity.js";

/** Horário de trabalho de um profissional em um dia da semana. */
@Entity('professional_working_hours')
@Index(["professional", "dayOfWeek"], { unique: true })
export class ProfessionalWorkingHoursEntity extends BaseEntity {

    /** Dia da semana (domingo = 0). */
    @Column({ type: 'smallint' })
    dayOfWeek: Weekday;

    /** Horário de início do expediente. */
    @Column({ type: 'time', nullable: true })
    startTime: string | null;

    /** Horário de fim do expediente. */
    @Column({ type: 'time', nullable: true })
    endTime: string | null;

    /** Folga neste dia. */
    @Column({ type: 'boolean', default: false })
    isDayOff: boolean;

    /** Profissional dono do horário. */
    @ManyToOne(() => ProfessionalEntity, e => e.workingHours, { nullable: false, onDelete: 'CASCADE',  })
    professional: Relation<ProfessionalEntity>;
}
