import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { NotificationStatus } from '../../../common/enums/notification-status.enum.js';
import { NotificationType } from '../../../common/enums/notification-type.enum.js';
import { CursorPaginationQueryDto } from '../../../common/http/cursor-pagination-query.dto.js';
import type { NotificationEntity } from '../../../database/entities/notification.entity.js';

const STATUSES = Object.values(NotificationStatus);

export class NotificationListQueryDto extends CursorPaginationQueryDto {
    @ApiPropertyOptional({ enum: STATUSES, description: 'Só lidas ou só não lidas; omitido traz todas.' })
    @IsOptional()
    @IsIn(STATUSES)
    status?: NotificationStatus;
}

export class NotificationResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ enum: Object.values(NotificationType), example: NotificationType.APPOINTMENT_CREATED })
    type: NotificationType;

    @ApiProperty({ enum: STATUSES, example: NotificationStatus.UNREAD })
    status: NotificationStatus;

    @ApiProperty({ example: 'Novo agendamento' })
    title: string;

    @ApiProperty({ example: 'Clara Cliente agendou Corte e Barba com Paulo para sexta-feira, 23 de outubro às 08:00.' })
    message: string;

    @ApiProperty({ type: String, format: 'date-time', nullable: true, description: '`null` enquanto não lida.' })
    readAt: Date | null;

    @ApiProperty({ type: String, format: 'uuid', nullable: true, description: 'Negócio relacionado, para montar o link.' })
    businessId: string | null;

    @ApiProperty({ type: String, format: 'uuid', nullable: true, description: 'Agendamento relacionado, para montar o link.' })
    appointmentId: string | null;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(notification: NotificationEntity): NotificationResponseDto {
        const dto = new NotificationResponseDto();
        dto.id = notification.id;
        dto.type = notification.type;
        dto.status = notification.status;
        dto.title = notification.title;
        dto.message = notification.message;
        dto.readAt = notification.readAt;
        dto.businessId = notification.business?.id ?? null;
        dto.appointmentId = notification.appointment?.id ?? null;
        dto.createdAt = notification.createdAt;
        return dto;
    }
}

export class UnreadCountResponseDto {
    @ApiProperty({ minimum: 0, example: 3 })
    count: number;
}
