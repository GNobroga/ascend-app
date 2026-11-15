import { Check, Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { BaseEntity } from "./base/base.entity.js";
import { PackageEntity } from "./package.entity.js";
import { ProfessionalEntity } from "./professional.entity.js";

/** Pacote executado por um profissional. */
@Entity('professional_packages')
@Index(["professional", "package"], { unique: true })
@Index(["package"])
@Check(`"commissionPercent" IS NULL OR "commissionPercent" BETWEEN 0 AND 100`)
export class ProfessionalPackageEntity extends BaseEntity {

    /** Percentual de comissão deste pacote (0 a 100); `null` usa o padrão do profissional. */
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

    /** Profissional que executa o pacote. */
    @ManyToOne(() => ProfessionalEntity, e => e.packages, { nullable: false, onDelete: 'CASCADE' })
    professional: Relation<ProfessionalEntity>;

    /** Pacote executado pelo profissional. */
    @ManyToOne(() => PackageEntity, e => e.professionals, { nullable: false, onDelete: 'CASCADE' })
    package: Relation<PackageEntity>;
}
