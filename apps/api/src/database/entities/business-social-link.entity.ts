import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { SocialNetwork } from "../../common/enums/social-network.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessEntity } from "./business.entity.js";

/** Link de rede social exibido na página pública do negócio. */
@Entity('business_social_links')
@Index(["business", "network"], { unique: true })
export class BusinessSocialLinkEntity extends BaseEntity {

    /** Rede social; define o ícone e o domínio aceito na URL. */
    @Column({ type: 'varchar', length: 20 })
    network: SocialNetwork;

    /** URL completa do perfil (https). */
    @Column({ type: 'varchar', length: 2048 })
    url: string;

    /** Negócio dono do link. */
    @ManyToOne(() => BusinessEntity, e => e.socialLinks, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;
}
