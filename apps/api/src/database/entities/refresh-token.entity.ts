import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { BaseEntity } from "./base/base.entity.js";
import { UserEntity } from "./user.entity.js";

/** Refresh token de uma sessão; só o hash é persistido. */
@Entity('refresh_tokens')
@Index(["user"])
export class RefreshTokenEntity extends BaseEntity {

    /** SHA-256 (hex) do token. */
    @Column({ type: 'varchar', length: 64 })
    @Index({ unique: true })
    tokenHash: string;

    /** Família de rotação: todos os tokens emitidos a partir do mesmo login. */
    @Column({ type: 'uuid' })
    @Index()
    familyId: string;

    /** Data de expiração. */
    @Column({ type: 'timestamptz' })
    @Index()
    expiresAt: Date;

    /** Data da revogação (rotação, logout ou reuso detectado). */
    @Column({ type: 'timestamptz', nullable: true })
    revokedAt: Date | null;

    /** Token que substituiu este na rotação. */
    @ManyToOne(() => RefreshTokenEntity, { nullable: true, onDelete: 'SET NULL' })
    replacedBy: Relation<RefreshTokenEntity> | null;

    /** Dono da sessão. */
    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
    user: Relation<UserEntity>;
}
