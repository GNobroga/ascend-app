import { Check, Column, Entity, Index, ManyToOne, type Relation } from "typeorm";
import { NotificationStatus } from "../../common/enums/notification-status.enum.js";
import { NotificationType } from "../../common/enums/notification-type.enum.js";
import { BaseEntity } from "./base/base.entity.js";
import { AppointmentEntity } from "./appointment.entity.js";
import { BusinessEntity } from "./business.entity.js";
import { UserEntity } from "./user.entity.js";

/** Notificação enviada a um usuário. */
@Entity('notifications')
@Index(["user", "status", "createdAt"])
@Index(["business"])
@Index(["appointment"])
@Check(`("status" = 'unread' AND "readAt" IS NULL) OR ("status" = 'read' AND "readAt" IS NOT NULL)`)
export class NotificationEntity extends BaseEntity {

    /** Tipo da notificação. */
    @Column({ type: 'varchar', length: 30 })
    type: NotificationType;

    /** Situação da notificação. */
    @Column({ type: 'varchar', length: 20, default: NotificationStatus.UNREAD })
    status: NotificationStatus;

    /** Título da notificação. */
    @Column({ type: 'varchar', length: 255 })
    title: string;

    /** Mensagem da notificação. */
    @Column({ type: 'text' })
    message: string;

    /** Data em que a notificação foi lida. */
    @Column({ type: 'timestamptz', nullable: true })
    readAt: Date | null;

    /** Usuário que recebe a notificação. */
    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
    user: Relation<UserEntity>;

    /** Negócio relacionado; opcional. */
    @ManyToOne(() => BusinessEntity, { nullable: true, onDelete: 'CASCADE' })
    business: Relation<BusinessEntity> | null;

    /** Agendamento relacionado; opcional. */
    @ManyToOne(() => AppointmentEntity, { nullable: true, onDelete: 'SET NULL' })
    appointment: Relation<AppointmentEntity> | null;
}
