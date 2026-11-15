import type { WhatsAppConnectionStatus } from '../enums/whatsapp-connection-status.enum.js';

export interface WhatsAppQrCode {
    code: string;
    base64: string | null;
}

export interface WhatsAppConnectionInfo {
    status: WhatsAppConnectionStatus;
    phoneNumber: string | null;
}

export class WhatsAppProviderError extends Error {

    constructor(message: string, readonly status: number | null) {
        super(message);
        this.name = WhatsAppProviderError.name;
    }
}

export abstract class WhatsAppProvider {

    abstract createInstance(instanceName: string): Promise<WhatsAppQrCode | null>;

    abstract connect(instanceName: string): Promise<WhatsAppQrCode | null>;

    abstract getConnection(instanceName: string): Promise<WhatsAppConnectionInfo | null>;

    abstract logout(instanceName: string): Promise<void>;

    abstract deleteInstance(instanceName: string): Promise<void>;

    abstract sendText(instanceName: string, phone: string, text: string, options?: { typingMs?: number }): Promise<void>;
}
