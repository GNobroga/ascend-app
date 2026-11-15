import { InjectQueue } from '@nestjs/bullmq';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { WhatsAppConnectionStatus } from '../../common/enums/whatsapp-connection-status.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import {
    WhatsAppProvider,
    WhatsAppProviderError,
    type WhatsAppConnectionInfo,
    type WhatsAppQrCode,
} from '../../common/whatsapp/whatsapp-provider.js';
import { BusinessWhatsAppConnectionEntity } from '../../database/entities/business-whatsapp-connection.entity.js';
import type { UpdateWhatsAppConnectionDto } from './dto/whatsapp-connection.dto.js';
import { DISCONNECTION_GRACE_MS, WHATSAPP_CONNECTION_QUEUE, type ConnectionCheckJob } from './whatsapp-connection-queue.js';
import { WhatsAppEvent, type WhatsAppDisconnectedEvent } from './whatsapp-events.js';

export interface WhatsAppConnectionView {
    connection: BusinessWhatsAppConnectionEntity;
    qrCode: WhatsAppQrCode | null;
}

const DISCONNECTED: WhatsAppConnectionInfo = { status: WhatsAppConnectionStatus.DISCONNECTED, phoneNumber: null };

@Injectable()
export class WhatsAppConnectionsService {

    private readonly logger = new Logger(WhatsAppConnectionsService.name);

    constructor(
        @InjectRepository(BusinessWhatsAppConnectionEntity) private readonly connections: Repository<BusinessWhatsAppConnectionEntity>,
        @InjectQueue(WHATSAPP_CONNECTION_QUEUE) private readonly checks: Queue<ConnectionCheckJob>,
        private readonly provider: WhatsAppProvider,
        private readonly events: EventEmitter2,
    ) { }

    async get(businessId: string): Promise<WhatsAppConnectionView> {
        const connection = await this.getByBusiness(businessId);
        const info = await this.callProvider(() => this.provider.getConnection(connection.instanceName));
        await this.applyState(connection, info ?? DISCONNECTED);
        const qrCode = connection.status === WhatsAppConnectionStatus.CONNECTING
            ? await this.callProvider(() => this.provider.connect(connection.instanceName))
            : null;
        return { connection, qrCode };
    }

    async connect(businessId: string): Promise<WhatsAppConnectionView> {
        const connection = await this.connections.findOneBy({ business: { id: businessId } })
            ?? this.connections.create({ business: { id: businessId }, instanceName: `business-${businessId}` });

        const info = await this.callProvider(() => this.provider.getConnection(connection.instanceName));
        if (info?.status === WhatsAppConnectionStatus.CONNECTED) {
            if (connection.id) {
                await this.applyState(connection, info);
            }
            throw new AppException(ErrorCode.WHATSAPP_ALREADY_CONNECTED, HttpStatus.CONFLICT, 'O WhatsApp deste negócio já está conectado.');
        }

        const qrCode = await this.callProvider(() => info
            ? this.provider.connect(connection.instanceName)
            : this.provider.createInstance(connection.instanceName));
        connection.termsAcceptedAt = new Date();
        await this.applyState(connection, { status: WhatsAppConnectionStatus.CONNECTING, phoneNumber: null });
        return { connection, qrCode };
    }

    async update(businessId: string, dto: UpdateWhatsAppConnectionDto): Promise<WhatsAppConnectionView> {
        const connection = await this.getByBusiness(businessId);
        this.connections.merge(connection, { enabled: dto.enabled });
        return { connection: await this.connections.save(connection), qrCode: null };
    }

    async disconnect(businessId: string): Promise<void> {
        const connection = await this.getByBusiness(businessId);
        await this.callProvider(async () => {
            await this.provider.logout(connection.instanceName);
            await this.provider.deleteInstance(connection.instanceName);
        });
        await this.connections.remove(connection);
    }

    async findSendableInstance(businessId: string): Promise<string | null> {
        const connection = await this.connections.findOneBy({ business: { id: businessId }, enabled: true });
        return connection?.instanceName ?? null;
    }

    async handleConnectionUpdate(instanceName: string, info: WhatsAppConnectionInfo): Promise<void> {
        const connection = await this.connections.findOneBy({ instanceName });
        if (!connection) {
            return;
        }
        if (info.status === WhatsAppConnectionStatus.CONNECTED || connection.status !== WhatsAppConnectionStatus.CONNECTED) {
            await this.applyState(connection, info);
            return;
        }
        await this.checks.add('check', { connectionId: connection.id }, { jobId: `check-${connection.id}`, delay: DISCONNECTION_GRACE_MS });
    }

    async confirmDisconnection(connectionId: string): Promise<void> {
        const connection = await this.connections.findOne({ where: { id: connectionId }, relations: { business: true } });
        if (connection?.status !== WhatsAppConnectionStatus.CONNECTED) {
            return;
        }
        const info = await this.provider.getConnection(connection.instanceName);
        if (info?.status === WhatsAppConnectionStatus.CONNECTED) {
            return;
        }
        await this.applyState(connection, info ?? DISCONNECTED);
        this.events.emit(WhatsAppEvent.DISCONNECTED, { businessId: connection.business.id } satisfies WhatsAppDisconnectedEvent);
    }

    private async applyState(connection: BusinessWhatsAppConnectionEntity, info: WhatsAppConnectionInfo): Promise<BusinessWhatsAppConnectionEntity> {
        const wasConnected = connection.status === WhatsAppConnectionStatus.CONNECTED;
        connection.status = info.status;
        if (info.status === WhatsAppConnectionStatus.CONNECTED) {
            connection.phoneNumber = info.phoneNumber ?? connection.phoneNumber;
            if (!wasConnected) {
                connection.connectedAt = new Date();
            }
        } else if (wasConnected) {
            connection.disconnectedAt = new Date();
        }
        return this.connections.save(connection);
    }

    private async getByBusiness(businessId: string): Promise<BusinessWhatsAppConnectionEntity> {
        const connection = await this.connections.findOneBy({ business: { id: businessId } });
        if (!connection) {
            throw new AppException(ErrorCode.WHATSAPP_CONNECTION_NOT_FOUND, HttpStatus.NOT_FOUND, 'O WhatsApp ainda não foi conectado neste negócio.');
        }
        return connection;
    }

    private async callProvider<T>(action: () => Promise<T>): Promise<T> {
        try {
            return await action();
        } catch (error) {
            if (!(error instanceof WhatsAppProviderError)) {
                throw error;
            }
            this.logger.error(error.message);
            throw new AppException(ErrorCode.WHATSAPP_UNAVAILABLE, HttpStatus.BAD_GATEWAY, 'O serviço de WhatsApp está indisponível. Tente novamente em instantes.');
        }
    }
}
