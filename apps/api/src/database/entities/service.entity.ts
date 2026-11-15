import { Column, Entity, ManyToOne, OneToMany, Index, type Relation } from "typeorm";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { AppointmentServiceEntity } from "./appointment-service.entity.js";
import { PackageServiceEntity } from "./package-service.entity.js";
import { ProfessionalServiceEntity } from "./professional-service.entity.js";
import { ServiceCategoryEntity } from "./service-category.entity.js";
import { ServiceImageEntity } from "./service-image.entity.js";

/** Serviço oferecido por um negócio. */
@Entity('services')
@Index(["business"])
@Index(["category"])
export class ServiceEntity extends SoftDeletableEntity {

    /** Nome do serviço. */
    @Column({ type: 'varchar', length: 255 })
    name: string;

    /** Descrição do serviço. */
    @Column({ type: 'text', nullable: true })
    description: string | null;

    /** Duração do serviço, em minutos. */
    @Column({ type: 'int' })
    durationInMinutes: number;

    /** Se o serviço está disponível para agendamento. */
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    /** Ordem de exibição. */
    @Column({ type: 'int', default: 0 })
    displayOrder: number;

    /** Preço do serviço. */
    @Column({
        type: 'numeric',
        precision: 10,
        scale: 2,
        transformer: { to: (value: number) => value, from: (value: string) => Number(value) },
    })
    price: number;

    /** Negócio que oferece o serviço. */
    @ManyToOne(() => BusinessEntity, e => e.services, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;

    /** Categoria do serviço; opcional. */
    @ManyToOne(() => ServiceCategoryEntity, e => e.services, { nullable: true, onDelete: 'SET NULL' })
    category: Relation<ServiceCategoryEntity> | null;

    /** Imagens do serviço. */
    @OneToMany(() => ServiceImageEntity, e => e.service)
    images: ServiceImageEntity[];

    /** Agendamentos que incluem o serviço. */
    @OneToMany(() => AppointmentServiceEntity, e => e.service)
    appointments: AppointmentServiceEntity[];

    /** Pacotes que incluem o serviço. */
    @OneToMany(() => PackageServiceEntity, e => e.service)
    packages: PackageServiceEntity[];

    /** Profissionais que executam o serviço. */
    @OneToMany(() => ProfessionalServiceEntity, e => e.service)
    professionals: ProfessionalServiceEntity[];
}
