import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { BusinessMemberRole } from "../../common/enums/business-member-role.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { UserEntity } from "./user.entity.js";

/** Convite para entrar em um negócio; o membro só é criado quando o convite é aceito. */
@Entity('business_invitations')
@Index(["business", "email"], { unique: true, where: `"acceptedAt" IS NULL AND "declinedAt" IS NULL AND "revokedAt" IS NULL` })
export class BusinessInvitationEntity extends BaseEntity {

    /** E-mail convidado, em minúsculas. */
    @Column({ type: 'varchar', length: 320 })
    email: string;

    /** Papéis que o membro recebe ao aceitar. */
    @Column({ type: 'varchar', length: 50, array: true })
    roles: BusinessMemberRole[];

    /** SHA-256 (hex) do token enviado por e-mail. */
    @Column({ type: 'varchar', length: 64 })
    @Index({ unique: true })
    tokenHash: string;

    /** Data de expiração do token atual. */
    @Column({ type: 'timestamptz' })
    expiresAt: Date;

    /** Data do aceite. */
    @Column({ type: 'timestamptz', nullable: true })
    acceptedAt: Date | null;

    /** Data da recusa pelo convidado. */
    @Column({ type: 'timestamptz', nullable: true })
    declinedAt: Date | null;

    /** Data da revogação pelo negócio. */
    @Column({ type: 'timestamptz', nullable: true })
    revokedAt: Date | null;

    /** Negócio do convite. */
    @ManyToOne(() => BusinessEntity, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;

    /** Usuário que enviou o convite por último. */
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
    invitedBy: Relation<UserEntity> | null;
}
