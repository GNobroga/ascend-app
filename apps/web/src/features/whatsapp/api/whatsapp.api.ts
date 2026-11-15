import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { api } from '@/shared/api/http';
import type { WhatsAppConnection } from '../types';

const whatsappPath = (businessId: string) => `/businesses/${businessId}/whatsapp`;

export const whatsappApi = {
  get: (businessId: string) =>
    api.get<WhatsAppConnection>(whatsappPath(businessId)).catch((error: unknown) => {
      if (hasErrorCode(error, ErrorCode.WHATSAPP_CONNECTION_NOT_FOUND)) return null;
      throw error;
    }),
  connect: (businessId: string) =>
    api.post<WhatsAppConnection>(whatsappPath(businessId), { acceptTerms: true }),
  setEnabled: (businessId: string, enabled: boolean) =>
    api.patch<WhatsAppConnection>(whatsappPath(businessId), { enabled }),
  disconnect: (businessId: string) => api.delete<void>(whatsappPath(businessId)),
};
