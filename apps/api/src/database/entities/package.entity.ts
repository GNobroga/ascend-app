import { Column, Entity, ManyToOne, OneToMany, Index, type Relation } from "typeorm";
import { CommissionMode } from "../../common/enums/commission-mode.enum.js";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { AppointmentEntity } from "./appointment.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { PackageImageEntity } from "./package-image.entity.js";
import { PackageServiceEntity } from "./package-service.entity.js";
import { ProfessionalPackageEntity } from "./professional-package.entity.js";

/** Pacote de serviços vendido como um item único. */
@Entity('packages')
@Index(["business"])
export class PackageEntity extends SoftDeletableEntity {

    /** Nome do pacote. */
    @Column({ type: 'varchar', length: 255 })
    name: string;

    /** Descrição do pacote. */
    @Column({ type: 'text', nullable: true })
    description: string | null;

    /** Preço do pacote. */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    price: number;

    /** Duração total do pacote, em minutos. */
    @Column({ type: 'int' })
    durationMinutes: number;

    /** Se o pacote está disponível para venda. */
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    /** Como a comissão é calculada: sobre o pacote ou rateada entre os serviços. */
    @Column({ type: 'varchar', length: 20, default: CommissionMode.PRORATED })
    commissionMode: CommissionMode;

    /** Ordem de exibição. */
    @Column({ type: 'int', default: 0 })
    displayOrder: number;

    /** Negócio dono do pacote. */
    @ManyToOne(() => BusinessEntity, e => e.packages, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;

    /** Agendamentos do pacote. */
    @OneToMany(() => AppointmentEntity, e => e.package)
    appointments: AppointmentEntity[];

    /** Imagens do pacote. */
    @OneToMany(() => PackageImageEntity, e => e.package)
    images: PackageImageEntity[];

    /** Serviços incluídos no pacote. */
    @OneToMany(() => PackageServiceEntity, e => e.package)
    services: PackageServiceEntity[];

    /** Profissionais que executam o pacote. */
    @OneToMany(() => ProfessionalPackageEntity, e => e.package)
    professionals: ProfessionalPackageEntity[];
}
