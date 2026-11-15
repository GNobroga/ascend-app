import { useMutation, useQueryClient } from '@tanstack/react-query';
import { whatsappApi } from './whatsapp.api';
import { whatsappQueries } from './whatsapp.queries';

export const useConnectWhatsApp = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => whatsappApi.connect(businessId),
    onSuccess: (connection) => queryClient.setQueryData(whatsappQueries.connection(businessId).queryKey, connection),
    onSettled: () => queryClient.invalidateQueries({ queryKey: whatsappQueries.all(businessId) }),
  });
};

export const useSetWhatsAppEnabled = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabled: boolean) => whatsappApi.setEnabled(businessId, enabled),
    onSuccess: (connection) => queryClient.setQueryData(whatsappQueries.connection(businessId).queryKey, connection),
  });
};

export const useDisconnectWhatsApp = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => whatsappApi.disconnect(businessId),
    onSuccess: () => queryClient.setQueryData(whatsappQueries.connection(businessId).queryKey, null),
  });
};
