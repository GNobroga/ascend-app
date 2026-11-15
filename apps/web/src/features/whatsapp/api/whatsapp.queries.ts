import { queryOptions } from '@tanstack/react-query';
import { WhatsAppConnectionStatus } from '../types';
import { whatsappApi } from './whatsapp.api';

const CONNECTING_POLL_MS = 3_000;

export const whatsappQueries = {
  all: (businessId: string) => ['whatsapp', businessId] as const,
  connection: (businessId: string) =>
    queryOptions({
      queryKey: [...whatsappQueries.all(businessId), 'connection'],
      queryFn: () => whatsappApi.get(businessId),
      refetchInterval: ({ state }) =>
        state.data?.status === WhatsAppConnectionStatus.CONNECTING ? CONNECTING_POLL_MS : false,
      refetchIntervalInBackground: false,
    }),
};
