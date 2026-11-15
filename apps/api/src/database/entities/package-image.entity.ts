import { Entity, ManyToOne, Index, type Relation } from "typeorm";
import { ImageBaseEntity } from "./base/image-base.entity.js";
import { PackageEntity } from "./package.entity.js";

/** Imagem de um pacote. */
@Entity('package_images')
@Index(["package"])
export class PackageImageEntity extends ImageBaseEntity {

    /** Pacote dono da imagem. */
    @ManyToOne(() => PackageEntity, e => e.images, { nullable: false, onDelete: 'CASCADE' })
    package: Relation<PackageEntity>;
}
