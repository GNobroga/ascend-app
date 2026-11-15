import { Check, Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { BaseEntity } from "./base/base.entity.js";
import { ProfessionalEntity } from "./professional.entity.js";
import { ServiceEntity } from "./service.entity.js";

/** Serviço executado por um profissional. */
@Entity('professional_services')
@Index(["professional", "service"], { unique: true })
@Index(["service"])
@Check(`"commissionPercent" IS NULL OR "commissionPercent" BETWEEN 0 AND 100`)
export class ProfessionalServiceEntity extends BaseEntity {

    /** Percentual de comissão deste serviço (0 a 100); `null` usa o padrão do profissional. */
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

    /** Profissional que executa o serviço. */
    @ManyToOne(() => ProfessionalEntity, e => e.services, { nullable: false, onDelete: 'CASCADE' })
    professional: Relation<ProfessionalEntity>;

    /** Serviço executado pelo profissional. */
    @ManyToOne(() => ServiceEntity, e => e.professionals, { nullable: false, onDelete: 'CASCADE' })
    service: Relation<ServiceEntity>;
}
