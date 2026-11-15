export const WhatsAppConnectionStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
} as const;

export type WhatsAppConnectionStatus = (typeof WhatsAppConnectionStatus)[keyof typeof WhatsAppConnectionStatus];

export type WhatsAppQrCode = {
  code: string;
  base64: string | null;
};

export type WhatsAppConnection = {
  status: WhatsAppConnectionStatus;
  phoneNumber: string | null;
  enabled: boolean;
  termsAcceptedAt: string;
  connectedAt: string | null;
  disconnectedAt: string | null;
  qrCode: WhatsAppQrCode | null;
};
