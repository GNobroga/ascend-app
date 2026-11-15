import { Controller, Get, HttpCode, HttpStatus, Post, Query, Sse, type MessageEvent } from '@nestjs/common';
import { ApiCookieAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { interval, map, merge, type Observable } from 'rxjs';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { ApiCursorPaginatedResponse, ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { encodeCursor } from '../../common/utilities/cursor.js';
import { NotificationListQueryDto, NotificationResponseDto, UnreadCountResponseDto } from './dto/notification.dto.js';
import { NotificationsService } from './notifications.service.js';

const UNAUTHENTICATED = 'Access token ausente ou inválido (`UNAUTHENTICATED`).';
const PING_INTERVAL_MS = 25_000;

@ApiTags('me')
@ApiCookieAuth()
@Controller('/api/me/notifications')
export class NotificationsController {

    constructor(private readonly notifications: NotificationsService) { }

    @Get()
    @ApiOperation({ summary: 'Minhas notificações', description: 'Mais recentes primeiro, paginadas por cursor: para a próxima página, envie `meta.nextCursor` em `cursor`.' })
    @ApiCursorPaginatedResponse(NotificationResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida (`VALIDATION_ERROR`) ou cursor inválido (`INVALID_CURSOR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    async list(@CurrentUser('id') userId: string, @Query() query: NotificationListQueryDto): Promise<ApiResponse<NotificationResponseDto[]>> {
        const notifications = await this.notifications.listForUser(userId, query);
        return ApiResponse.cursorPaginated(notifications.map((n) => NotificationResponseDto.from(n)), query, (last) => encodeCursor({ at: last.createdAt, id: last.id }));
    }

    @Sse('stream')
    @ApiOperation({
        summary: 'Notificações em tempo real (SSE)',
        description: 'Abrir com `EventSource` (`withCredentials: true`). Cada notificação nova chega como evento `notification`, no formato da listagem; '
            + `um evento \`ping\` a cada ${PING_INTERVAL_MS / 1000} s mantém a conexão. Sem replay: ao reconectar, recarregue a lista e o \`unread-count\`. `
            + 'Se o access token expirar, a reconexão recebe 401: chame `/api/auth/refresh` e reabra o stream.',
    })
    @ApiProduces('text/event-stream')
    @ApiOkResponse({ description: 'Stream `text/event-stream` com eventos `notification` e `ping`.' })
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    stream(@CurrentUser('id') userId: string): Observable<MessageEvent> {
        return merge(
            this.notifications.subscribe(userId).pipe(map((notification): MessageEvent => ({ type: 'notification', id: notification.id, data: notification }))),
            interval(PING_INTERVAL_MS).pipe(map((): MessageEvent => ({ type: 'ping', data: '' }))),
        );
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Quantidade de notificações não lidas' })
    @ApiDataResponse(UnreadCountResponseDto)
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    async unreadCount(@CurrentUser('id') userId: string): Promise<ApiResponse<UnreadCountResponseDto>> {
        return ApiResponse.of({ count: await this.notifications.countUnread(userId) });
    }

    @Post('read-all')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Marca todas como lidas' })
    @ApiNoContentResponse({ description: 'Notificações marcadas.' })
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    async markAllRead(@CurrentUser('id') userId: string): Promise<void> {
        await this.notifications.markAllRead(userId);
    }

    @Post(':notificationId/read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Marca uma notificação como lida', description: 'Idempotente: uma notificação já lida mantém o `readAt` original.' })
    @ApiDataResponse(NotificationResponseDto, { description: 'Notificação lida.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`notificationId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Notificação não encontrada entre as do usuário (`NOTIFICATION_NOT_FOUND`).')
    async markRead(@CurrentUser('id') userId: string, @UuidParam('notificationId') notificationId: string): Promise<ApiResponse<NotificationResponseDto>> {
        return ApiResponse.of(NotificationResponseDto.from(await this.notifications.markRead(userId, notificationId)));
    }
}
