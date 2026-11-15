import { Column, Entity, Index, JoinColumn, OneToOne, type Relation } from "typeorm";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { WhatsAppConnectionStatus } from "../../common/enums/whatsapp-connection-status.enum.js";

@Entity('business_whatsapp_connections')
export class BusinessWhatsAppConnectionEntity extends BaseEntity {

    @Column({ type: 'varchar', length: 100 })
    @Index({ unique: true })
    instanceName: string;

    @Column({ type: 'varchar', length: 20, default: WhatsAppConnectionStatus.DISCONNECTED })
    status: WhatsAppConnectionStatus;

    @Column({ type: 'varchar', length: 20, nullable: true })
    phoneNumber: string | null;

    @Column({ type: 'boolean', default: true })
    enabled: boolean;

    @Column({ type: 'timestamptz' })
    termsAcceptedAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    connectedAt: Date | null;

    @Column({ type: 'timestamptz', nullable: true })
    disconnectedAt: Date | null;

    @OneToOne(() => BusinessEntity, e => e.whatsappConnection, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn()
    business: Relation<BusinessEntity>;
}
