export const WhatsAppEvent = {
    DISCONNECTED: 'whatsapp.disconnected',
} as const;

export interface WhatsAppDisconnectedEvent {
    businessId: string;
}
