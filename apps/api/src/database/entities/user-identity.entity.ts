import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { AuthProvider } from "../../common/enums/auth-provider.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { UserEntity } from "./user.entity.js";

/** Conta de um usuário em um provider externo. */
@Entity('user_identities')
@Index(["user"])
@Index(["provider", "providerUserId"], { unique: true })
export class UserIdentityEntity extends BaseEntity {

    /** Provider de autenticação. */
    @Column({ type: 'varchar', length: 50 })
    provider: AuthProvider;

    /** ID do usuário no provider. */
    @Column({ type: 'varchar', length: 255 })
    providerUserId: string;

    /** E-mail confirmado pelo provider. */
    @Column({ type: 'boolean', default: false })
    emailVerified: boolean;

    /** Usuário dono da identidade. */
    @ManyToOne(() => UserEntity)
    user: Relation<UserEntity>;
}
