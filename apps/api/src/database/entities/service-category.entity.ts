import { Column, Entity, ManyToOne, OneToMany, Index, type Relation } from "typeorm";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { ServiceEntity } from "./service.entity.js";

/** Categoria que agrupa serviços. */
@Entity('service_categories')
@Index(["business"])
export class ServiceCategoryEntity extends SoftDeletableEntity {

    /** Nome da categoria. */
    @Column({ type: 'varchar', length: 100 })
    name: string;

    /** Descrição da categoria. */
    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string | null;

    /** Ordem de exibição. */
    @Column({ type: 'int', default: 0 })
    displayOrder: number;

    /** Se a categoria está disponível. */
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    /** Negócio dono da categoria. */
    @ManyToOne(() => BusinessEntity, e => e.serviceCategories, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;

    /** Serviços da categoria. */
    @OneToMany(() => ServiceEntity, e => e.category)
    services: ServiceEntity[];
}
