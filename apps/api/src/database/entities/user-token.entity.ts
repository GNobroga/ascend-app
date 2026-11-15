import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { UserTokenType } from "../../common/enums/user-token-type.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { UserEntity } from "./user.entity.js";

/** Token de uso único enviado por e-mail (verificação, redefinição de senha); só o hash é persistido. */
@Entity('user_tokens')
@Index(["user", "type"])
export class UserTokenEntity extends BaseEntity {

    /** Finalidade do token. */
    @Column({ type: 'varchar', length: 30 })
    type: UserTokenType;

    /** SHA-256 (hex) do token. */
    @Column({ type: 'varchar', length: 64 })
    @Index({ unique: true })
    tokenHash: string;

    /** Data de expiração. */
    @Column({ type: 'timestamptz' })
    @Index()
    expiresAt: Date;

    /** Data do primeiro uso. */
    @Column({ type: 'timestamptz', nullable: true })
    usedAt: Date | null;

    /** Dono do token. */
    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
    user: Relation<UserEntity>;
}
