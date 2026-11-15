import { Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { AppointmentStatus } from "../../common/enums/appointment-status.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { AppointmentEntity } from "./appointment.entity.js";
import { UserEntity } from "./user.entity.js";

/** Registro de uma mudança de status de um agendamento. */
@Entity('appointment_status_histories')
@Index(["changedByUser"])
@Index(["appointment", "createdAt"])
export class AppointmentStatusHistoryEntity extends BaseEntity {

    /** Status anterior; `null` na criação do agendamento. */
    @Column({ type: 'varchar', length: 20, nullable: true })
    previousStatus: AppointmentStatus | null;

    /** Novo status. */
    @Column({ type: 'varchar', length: 20 })
    newStatus: AppointmentStatus;

    /** Motivo da mudança. */
    @Column({ type: 'text', nullable: true })
    reason: string | null;

    /** Agendamento que mudou de status. */
    @ManyToOne(() => AppointmentEntity, e => e.statusHistory, { nullable: false, onDelete: 'CASCADE' })
    appointment: Relation<AppointmentEntity>;

    /** Usuário que fez a mudança; `null` quando feita pelo sistema. */
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
    changedByUser: Relation<UserEntity> | null;
}
