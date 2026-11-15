export const WhatsAppConnectionStatus = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
} as const;

export type WhatsAppConnectionStatus = (typeof WhatsAppConnectionStatus)[keyof typeof WhatsAppConnectionStatus];
