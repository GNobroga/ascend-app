import { Column, Entity, Index, OneToMany, OneToOne, type Relation } from "typeorm";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { BusinessHourEntity } from "./business-hour.entity.js";
import { BusinessImageEntity } from "./business-image.entity.js";
import { BusinessMemberEntity } from "./business-member.entity.js";
import { BusinessPaymentMethodEntity } from "./business-payment-method.entity.js";
import { BusinessSettingEntity } from "./business-setting.entity.js";
import { BusinessSocialLinkEntity } from "./business-social-link.entity.js";
import { BusinessSubscriptionEntity } from "./business-subscription.entity.js";
import { BusinessWhatsAppConnectionEntity } from "./business-whatsapp-connection.entity.js";
import { CustomerEntity } from "./customer.entity.js";
import { PackageEntity } from "./package.entity.js";
import { ReviewEntity } from "./review.entity.js";
import { ServiceCategoryEntity } from "./service-category.entity.js";
import { ServiceEntity } from "./service.entity.js";
import { SpecialtyEntity } from "./specialty.entity.js";
import { Address } from "./embedded/address.embedded.js";
import { BusinessStatus } from "../../common/enums/business-status.enum.js";

/** Negócio cadastrado. */
@Entity('businesses')
export class BusinessEntity extends SoftDeletableEntity {

    /** Nome do negócio. */
    @Column({ type: 'varchar', length: 255 })
    name: string;

    /** Slug único para URLs. */
    @Column({ type: 'varchar', length: 100 })
    @Index({ unique: true })
    slug: string;

    /** Descrição do negócio. */
    @Column({ type: 'text', nullable: true })
    description: string | null;

    /** Key do logotipo no storage. */
    @Column({ type: 'varchar', length: 2048, nullable: true })
    logoKey: string | null;

    /** E-mail de contato. */
    @Column({ type: 'varchar', length: 320 })
    email: string;

    /** CNPJ ou CPF, sem máscara (único). */
    @Column({ type: 'varchar', length: 14 })
    @Index({ unique: true })
    taxId: string;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    @Column({ type: 'boolean', default: false })
    phoneIsWhatsApp: boolean;

    /** Situação do negócio. */
    @Column({ type: 'varchar', length: 20, default: BusinessStatus.ACTIVE })
    status: BusinessStatus;

    /** Fuso horário IANA do negócio (ex.: America/Sao_Paulo). */
    @Column({ type: 'varchar', length: 64, default: 'America/Sao_Paulo' })
    timezone: string;

    /** Endereço do negócio. */
    @Column(() => Address)
    address: Address;

    /** Imagens do negócio. */
    @OneToMany(() => BusinessImageEntity, e => e.business)
    images: BusinessImageEntity[];

    /** Horários de funcionamento. */
    @OneToMany(() => BusinessHourEntity, e => e.business)
    hours: BusinessHourEntity[];

    /** Redes sociais exibidas na página pública. */
    @OneToMany(() => BusinessSocialLinkEntity, e => e.business)
    socialLinks: BusinessSocialLinkEntity[];

    /** Membros do negócio. */
    @OneToMany(() => BusinessMemberEntity, e => e.business)
    members: BusinessMemberEntity[];

    /** Formas de pagamento aceitas. */
    @OneToMany(() => BusinessPaymentMethodEntity, e => e.business)
    paymentMethods: BusinessPaymentMethodEntity[];

    /** Categorias de serviço do negócio. */
    @OneToMany(() => ServiceCategoryEntity, e => e.business)
    serviceCategories: ServiceCategoryEntity[];

    /** Avaliações do negócio. */
    @OneToMany(() => ReviewEntity, e => e.business)
    reviews: ReviewEntity[];

    /** Especialidades do negócio. */
    @OneToMany(() => SpecialtyEntity, e => e.business)
    specialties: SpecialtyEntity[];

    /** Clientes do negócio. */
    @OneToMany(() => CustomerEntity, e => e.business)
    customers: CustomerEntity[];

    /** Pacotes do negócio. */
    @OneToMany(() => PackageEntity, e => e.business)
    packages: PackageEntity[];

    /** Serviços do negócio. */
    @OneToMany(() => ServiceEntity, e => e.business)
    services: ServiceEntity[];

    /** Configurações de agendamento. */
    @OneToOne(() => BusinessSettingEntity, e => e.business)
    setting: Relation<BusinessSettingEntity>;

    @OneToOne(() => BusinessSubscriptionEntity, e => e.business)
    subscription: Relation<BusinessSubscriptionEntity>;

    @OneToOne(() => BusinessWhatsAppConnectionEntity, e => e.business)
    whatsappConnection: Relation<BusinessWhatsAppConnectionEntity> | null;

}
