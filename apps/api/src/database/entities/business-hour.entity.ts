import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { Weekday } from "../../common/enums/weekday.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessEntity } from "./business.entity.js";

/** Horário de funcionamento em um dia da semana. */
@Entity('business_hours')
@Index(["business", "dayOfWeek"], { unique: true })
export class BusinessHourEntity extends BaseEntity {

    /** Dia da semana (domingo = 0). */
    @Column({ type: 'smallint' })
    dayOfWeek: Weekday;

    /** Horário de abertura. */
    @Column({ type: 'time', nullable: true })
    openTime: string | null;

    /** Horário de fechamento. */
    @Column({ type: 'time', nullable: true })
    closeTime: string | null;

    /** Fechado neste dia. */
    @Column({ type: 'boolean', default: false })
    isClosed: boolean;

    /** Negócio dono do horário. */
    @ManyToOne(() => BusinessEntity, e => e.hours, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;
}
