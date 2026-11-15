import { Column, Entity, ManyToOne, Index, type Relation } from "typeorm";
import { BusinessImageType } from "../../common/enums/business-image-type.enum.js";
import { ImageBaseEntity } from "./base/image-base.entity.js";
import { BusinessEntity } from "./business.entity.js";

/** Imagem de um negócio. */
@Entity('business_images')
@Index(["business"])
export class BusinessImageEntity extends ImageBaseEntity {

    /** Finalidade da imagem. */
    @Column({ type: 'varchar', length: 20, default: BusinessImageType.GALLERY })
    type: BusinessImageType;

    /** Negócio dono da imagem. */
    @ManyToOne(() => BusinessEntity, e => e.images, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;
}
