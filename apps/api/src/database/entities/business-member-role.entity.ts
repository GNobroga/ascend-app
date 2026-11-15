import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { BusinessMemberRole } from "../../common/enums/business-member-role.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { BusinessMemberEntity } from "./business-member.entity.js";

/** Papel exercido por um membro em um negócio. */
@Entity('business_member_roles')
@Index(["member", "role"], { unique: true })
export class BusinessMemberRoleEntity extends BaseEntity {

    /** Papel do membro. */
    @Column({ type: 'varchar', length: 50 })
    role: BusinessMemberRole;

    /** Membro que exerce o papel. */
    @ManyToOne(() => BusinessMemberEntity, e => e.roles, { nullable: false, onDelete: 'CASCADE' })
    member: Relation<BusinessMemberEntity>;
}
