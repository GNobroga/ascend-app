import { HttpStatus, Injectable } from '@nestjs/common';
import { env } from '../../config/env.config.js';
import { WhatsAppConnectionStatus } from '../enums/whatsapp-connection-status.enum.js';
import { WhatsAppProvider, WhatsAppProviderError, type WhatsAppConnectionInfo, type WhatsAppQrCode } from './whatsapp-provider.js';

const REQUEST_TIMEOUT_MS = 15_000;
const WEBHOOK_EVENTS = ['CONNECTION_UPDATE'];

export const EVOLUTION_WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

interface EvolutionQrCode {
    code?: string | null;
    base64?: string | null;
}

interface EvolutionCreateResponse {
    qrcode?: EvolutionQrCode;
}

interface EvolutionInstance {
    connectionStatus: string;
    ownerJid: string | null;
}

const STATE_TO_STATUS: Partial<Record<string, WhatsAppConnectionStatus>> = {
    open: WhatsAppConnectionStatus.CONNECTED,
    connecting: WhatsAppConnectionStatus.CONNECTING,
};

export const toWhatsAppStatus = (state: string): WhatsAppConnectionStatus =>
    STATE_TO_STATUS[state] ?? WhatsAppConnectionStatus.DISCONNECTED;

export const jidToPhone = (jid: string | null | undefined): string | null => {
    const digits = jid?.split('@')[0]?.split(':')[0];
    return digits ? `+${digits}` : null;
};

const toQrCode = (qrcode: EvolutionQrCode | null | undefined): WhatsAppQrCode | null =>
    qrcode?.code ? { code: qrcode.code, base64: qrcode.base64 ?? null } : null;

@Injectable()
export class EvolutionProvider extends WhatsAppProvider {

    async createInstance(instanceName: string): Promise<WhatsAppQrCode | null> {
        const response = await this.request<EvolutionCreateResponse>('POST', '/instance/create', {
            instanceName,
            integration: 'WHATSAPP-BAILEYS',
            qrcode: true,
            webhook: {
                url: env.EVOLUTION_WEBHOOK_URL,
                byEvents: false,
                base64: true,
                headers: { [EVOLUTION_WEBHOOK_SECRET_HEADER]: env.EVOLUTION_WEBHOOK_SECRET },
                events: WEBHOOK_EVENTS,
            },
        });
        return toQrCode(response?.qrcode);
    }

    async connect(instanceName: string): Promise<WhatsAppQrCode | null> {
        return toQrCode(await this.request<EvolutionQrCode>('GET', `/instance/connect/${encodeURIComponent(instanceName)}`));
    }

    async getConnection(instanceName: string): Promise<WhatsAppConnectionInfo | null> {
        const instances = await this.request<EvolutionInstance[]>(
            'GET',
            `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
            undefined,
            { allowNotFound: true },
        );
        const instance = instances?.[0];
        if (!instance) {
            return null;
        }
        const status = toWhatsAppStatus(instance.connectionStatus);
        return { status, phoneNumber: status === WhatsAppConnectionStatus.CONNECTED ? jidToPhone(instance.ownerJid) : null };
    }

    async logout(instanceName: string): Promise<void> {
        await this.request('DELETE', `/instance/logout/${encodeURIComponent(instanceName)}`, undefined, { allowNotFound: true });
    }

    async deleteInstance(instanceName: string): Promise<void> {
        await this.request('DELETE', `/instance/delete/${encodeURIComponent(instanceName)}`, undefined, { allowNotFound: true });
    }

    async sendText(instanceName: string, phone: string, text: string, { typingMs }: { typingMs?: number } = {}): Promise<void> {
        await this.request('POST', `/message/sendText/${encodeURIComponent(instanceName)}`, {
            number: phone.replace(/\D/g, ''),
            text,
            ...(typingMs && { delay: typingMs }),
        });
    }

    private async request<T>(
        method: 'GET' | 'POST' | 'DELETE',
        path: string,
        body?: unknown,
        { allowNotFound = false }: { allowNotFound?: boolean } = {},
    ): Promise<T | null> {
        const init: RequestInit = body === undefined
            ? { method, headers: { apikey: env.EVOLUTION_API_KEY } }
            : { method, headers: { apikey: env.EVOLUTION_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };

        let response: Response;
        try {
            response = await fetch(new URL(path, env.EVOLUTION_API_URL), { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
        } catch (error) {
            throw new WhatsAppProviderError(`Evolution API indisponível: ${error instanceof Error ? error.message : String(error)}`, null);
        }

        if (allowNotFound && response.status === HttpStatus.NOT_FOUND) {
            return null;
        }
        if (!response.ok) {
            throw new WhatsAppProviderError(`Evolution API respondeu ${response.status} em ${method} ${path}: ${await response.text()}`, response.status);
        }
        return await response.json() as T;
    }
}
