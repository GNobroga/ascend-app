import { Entity, Index, ManyToOne, type Relation } from "typeorm";
import { BaseEntity } from "./base/base.entity.js";
import { PackageEntity } from "./package.entity.js";
import { ServiceEntity } from "./service.entity.js";

/** Serviço incluído em um pacote. */
@Entity('package_services')
@Index(["package", "service"], { unique: true })
@Index(["service"])
export class PackageServiceEntity extends BaseEntity {

    /** Pacote que inclui o serviço. */
    @ManyToOne(() => PackageEntity, e => e.services, { nullable: false, onDelete: 'CASCADE' })
    package: Relation<PackageEntity>;

    /** Serviço incluído no pacote. */
    @ManyToOne(() => ServiceEntity, e => e.packages, { nullable: false, onDelete: 'CASCADE' })
    service: Relation<ServiceEntity>;
}
