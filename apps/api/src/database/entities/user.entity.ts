import { Column, Entity, Index, OneToMany } from "typeorm";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { UserIdentityEntity } from "./user-identity.entity.js";

/** Usuário da plataforma. */
@Entity('users')
export class UserEntity extends SoftDeletableEntity {

    /** Nome completo. */
    @Column({ type: 'varchar', length: 255 })
    name: string;

    /** E-mail de login (único). */
    @Column({ type: 'varchar', length: 320 })
    @Index({ unique: true, })
    email: string;

    /** Data de verificação do e-mail. */
    @Column({ type: 'timestamptz', nullable: true })
    emailVerifiedAt: Date | null;

    /** Hash da senha (opcional). */
    @Column({ type: 'varchar', length: 255, nullable: true })
    passwordHash: string | null;

    /** URL externa da foto de perfil (ex.: Google); a enviada pelo usuário (`photoKey`) tem precedência. */
    @Column({ type: 'varchar', length: 2048, nullable: true })
    photoUrl: string | null;

    /** Key da foto de perfil enviada pelo usuário no storage. */
    @Column({ type: 'varchar', length: 2048, nullable: true })
    photoKey: string | null;

    /** Telefone do usuário, com DDI (ex.: +5511999999999). */
    @Column({ type: 'varchar', length: 20, nullable: true })
    phone: string | null;

    /** Data de verificação do telefone. */
    @Column({ type: 'timestamptz', nullable: true })
    phoneVerifiedAt: Date | null;

    /** Identidades externas vinculadas. */
    @OneToMany(() => UserIdentityEntity, e => e.user)
    identities: UserIdentityEntity[];
}
