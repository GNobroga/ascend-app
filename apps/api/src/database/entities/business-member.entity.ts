import { Column, Entity, Index, ManyToOne, OneToMany, OneToOne, type Relation } from "typeorm";
import { BusinessMemberStatus } from "../../common/enums/business-member-status.enum.js";
import { SoftDeletableEntity } from "./base/soft-deletable.entity.js";
import { BusinessMemberRoleEntity } from "./business-member-role.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { ProfessionalEntity } from "./professional.entity.js";
import { UserEntity } from "./user.entity.js";

/** Vínculo de um usuário com um negócio. */
@Entity('business_members')
@Index(["business", "user"], { unique: true })
@Index(["user"])
export class BusinessMemberEntity extends SoftDeletableEntity {

    /** Situação do vínculo. */
    @Column({ type: 'varchar', length: 20, default: BusinessMemberStatus.ACTIVE })
    status: BusinessMemberStatus;

    /** Data em que o membro entrou no negócio. */
    @Column({ type: 'timestamptz', default: () => 'now()' })
    joinedAt: Date;

    /** Negócio do vínculo. */
    @ManyToOne(() => BusinessEntity, e => e.members, { nullable: false, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity>;

    /** Usuário do vínculo. */
    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
    user: Relation<UserEntity>;

    /** Papéis do membro no negócio. */
    @OneToMany(() => BusinessMemberRoleEntity, e => e.member)
    roles: BusinessMemberRoleEntity[];

    /** Perfil de profissional do membro, se atender clientes. */
    @OneToOne(() => ProfessionalEntity, e => e.member)
    professional: Relation<ProfessionalEntity> | null;
}
