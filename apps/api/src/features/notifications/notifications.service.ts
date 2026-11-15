import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { NotificationStatus } from '../../common/enums/notification-status.enum.js';
import type { NotificationType } from '../../common/enums/notification-type.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { decodeCursor } from '../../common/utilities/cursor.js';
import { NotificationEntity } from '../../database/entities/notification.entity.js';
import { NotificationResponseDto, type NotificationListQueryDto } from './dto/notification.dto.js';
import { NotificationStream } from './notification-stream.js';

export interface CreateNotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    businessId: string | null;
    appointmentId: string | null;
}

const RELATION_IDS = { relations: ['business', 'appointment'], disableMixedMap: true };

@Injectable()
export class NotificationsService {

    constructor(
        @InjectRepository(NotificationEntity) private readonly notifications: Repository<NotificationEntity>,
        private readonly stream: NotificationStream,
    ) { }

    async createMany(inputs: CreateNotificationInput[]): Promise<void> {
        if (!inputs.length) {
            return;
        }
        const created = await this.notifications.save(inputs.map((input) => this.notifications.create({
            user: { id: input.userId },
            type: input.type,
            title: input.title,
            message: input.message,
            readAt: null,
            business: input.businessId ? { id: input.businessId } : null,
            appointment: input.appointmentId ? { id: input.appointmentId } : null,
        })));
        for (const notification of created) {
            this.stream.publish(notification.user.id, NotificationResponseDto.from(notification));
        }
    }

    subscribe(userId: string): Observable<NotificationResponseDto> {
        return this.stream.subscribe(userId);
    }

    /** Devolve até `limit + 1` itens; o cursor compara em milissegundos, a precisão que chega ao `Date` do JS. */
    listForUser(userId: string, query: NotificationListQueryDto): Promise<NotificationEntity[]> {
        const after = query.cursor === undefined ? null : decodeCursor(query.cursor);
        if (query.cursor !== undefined && !after) {
            throw new AppException(ErrorCode.INVALID_CURSOR, HttpStatus.BAD_REQUEST, 'Cursor inválido.');
        }

        const qb = this.notifications.createQueryBuilder('notification')
            .where('notification.user = :userId', { userId })
            .orderBy("date_trunc('milliseconds', notification.createdAt)", 'DESC')
            .addOrderBy('notification.id', 'DESC')
            .limit(query.limit + 1)
            .loadAllRelationIds(RELATION_IDS);
        if (query.status) {
            qb.andWhere('notification.status = :status', { status: query.status });
        }
        if (after) {
            qb.andWhere("(date_trunc('milliseconds', notification.createdAt), notification.id) < (:at, :id)", { at: after.at, id: after.id });
        }
        return qb.getMany();
    }

    countUnread(userId: string): Promise<number> {
        return this.notifications.countBy({ user: { id: userId }, status: NotificationStatus.UNREAD });
    }

    async markRead(userId: string, id: string): Promise<NotificationEntity> {
        const notification = await this.notifications.findOne({ where: { id, user: { id: userId } }, loadRelationIds: RELATION_IDS });
        if (!notification) {
            throw new AppException(ErrorCode.NOTIFICATION_NOT_FOUND, HttpStatus.NOT_FOUND, 'Notificação não encontrada.');
        }
        if (notification.status === NotificationStatus.UNREAD) {
            notification.status = NotificationStatus.READ;
            notification.readAt = new Date();
            await this.notifications.update({ id, status: NotificationStatus.UNREAD }, { status: notification.status, readAt: notification.readAt });
        }
        return notification;
    }

    async markAllRead(userId: string): Promise<void> {
        await this.notifications.update(
            { user: { id: userId }, status: NotificationStatus.UNREAD },
            { status: NotificationStatus.READ, readAt: new Date() },
        );
    }
}
