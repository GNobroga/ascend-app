import { Entity, ManyToOne, Index, type Relation } from "typeorm";
import { ImageBaseEntity } from "./base/image-base.entity.js";
import { ServiceEntity } from "./service.entity.js";

/** Imagem de um serviço. */
@Entity('service_images')
@Index(["service"])
export class ServiceImageEntity extends ImageBaseEntity {

    /** Serviço dono da imagem. */
    @ManyToOne(() => ServiceEntity, e => e.images, { nullable: false, onDelete: 'CASCADE' })
    service: Relation<ServiceEntity>;
}
