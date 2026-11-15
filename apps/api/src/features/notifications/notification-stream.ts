import { Injectable } from '@nestjs/common';
import { filter, map, Subject, type Observable } from 'rxjs';
import type { NotificationResponseDto } from './dto/notification.dto.js';

export abstract class NotificationStream {
    abstract publish(userId: string, notification: NotificationResponseDto): void;
    abstract subscribe(userId: string): Observable<NotificationResponseDto>;
}

/** Só entrega a quem está conectado nesta instância; com várias instâncias, troque por `LISTEN/NOTIFY` (spec de notificações, Etapa 4). */
@Injectable()
export class InMemoryNotificationStream extends NotificationStream {

    private readonly published = new Subject<{ userId: string; notification: NotificationResponseDto }>();

    publish(userId: string, notification: NotificationResponseDto): void {
        this.published.next({ userId, notification });
    }

    subscribe(userId: string): Observable<NotificationResponseDto> {
        return this.published.pipe(
            filter((event) => event.userId === userId),
            map((event) => event.notification),
        );
    }
}
