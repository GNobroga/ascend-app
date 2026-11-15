import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { subscriptionQueries } from '@/features/subscriptions';
import type { SocialLink } from '../social-networks';
import type { BusinessImage } from '../types';
import {
  businessesApi,
  type PaymentMethodRequest,
  type SetBusinessHoursRequest,
  type UpdateBusinessImageRequest,
  type UpdateBusinessRequest,
  type UpdateBusinessSettingsRequest,
} from './businesses.api';
import { businessQueries } from './businesses.queries';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

export const useCreateBusiness = ({ onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: businessesApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessQueries.all() }),
    onError,
  });
};

type SetSocialLinksCallbacks = {
  onError?: (error: Error, links: SocialLink[]) => void;
};

export const useSetBusinessSocialLinks = (businessId: string, { onError }: SetSocialLinksCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (links: SocialLink[]) => businessesApi.setSocialLinks(businessId, links),
    onSuccess: (links) => queryClient.setQueryData(businessQueries.socialLinks(businessId).queryKey, links),
    onError,
  });
};

export const useSetBusinessHours = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SetBusinessHoursRequest) => businessesApi.setHours(businessId, body),
    onSuccess: (hours) => {
      queryClient.setQueryData(businessQueries.hours(businessId).queryKey, hours);
      return queryClient.invalidateQueries({ queryKey: subscriptionQueries.byBusiness(businessId).queryKey });
    },
    onError,
  });
};

export const useUpdateBusinessSettings = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateBusinessSettingsRequest) => businessesApi.updateSettings(businessId, body),
    onSuccess: (settings) => queryClient.setQueryData(businessQueries.settings(businessId).queryKey, settings),
    onError,
  });
};

const refreshBusiness = (queryClient: QueryClient, businessId: string) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: businessQueries.mine().queryKey }),
    queryClient.invalidateQueries({ queryKey: businessQueries.detail(businessId).queryKey }),
  ]);

export const useUpdateBusiness = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateBusinessRequest) => businessesApi.update(businessId, body),
    onSuccess: (business) => {
      queryClient.setQueryData(businessQueries.detail(businessId).queryKey, business);
      return queryClient.invalidateQueries({ queryKey: businessQueries.mine().queryKey });
    },
    onError,
  });
};

export const useSetBusinessLogo = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => businessesApi.setLogo(businessId, file),
    onSuccess: () => refreshBusiness(queryClient, businessId),
  });
};

export const useRemoveBusinessLogo = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => businessesApi.removeLogo(businessId),
    onSuccess: () => refreshBusiness(queryClient, businessId),
  });
};

type UpdatePaymentMethodVariables = {
  paymentMethodId: string;
  body: Partial<PaymentMethodRequest>;
};

const invalidatePaymentMethods = (queryClient: QueryClient, businessId: string) =>
  queryClient.invalidateQueries({ queryKey: businessQueries.paymentMethods(businessId).queryKey });

export const useCreatePaymentMethod = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PaymentMethodRequest) => businessesApi.createPaymentMethod(businessId, body),
    onSuccess: () => invalidatePaymentMethods(queryClient, businessId),
    onError,
  });
};

export const useUpdatePaymentMethod = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ paymentMethodId, body }: UpdatePaymentMethodVariables) =>
      businessesApi.updatePaymentMethod(businessId, paymentMethodId, body),
    onSuccess: () => invalidatePaymentMethods(queryClient, businessId),
    onError,
  });
};

export const useRemovePaymentMethod = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentMethodId: string) => businessesApi.removePaymentMethod(businessId, paymentMethodId),
    onSuccess: () => invalidatePaymentMethods(queryClient, businessId),
  });
};

type UpdateImageVariables = {
  imageId: string;
  body: UpdateBusinessImageRequest;
};

export const useUploadBusinessImage = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => businessesApi.uploadImage(businessId, file),
    onSuccess: (image) =>
      queryClient.setQueryData(businessQueries.images(businessId).queryKey, (images: BusinessImage[] = []) => [
        ...images,
        image,
      ]),
  });
};

export const useUpdateBusinessImage = (businessId: string, { onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, body }: UpdateImageVariables) => businessesApi.updateImage(businessId, imageId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: businessQueries.images(businessId).queryKey }),
    onError,
  });
};

export const useReorderBusinessImages = (businessId: string) => {
  const queryClient = useQueryClient();
  const { queryKey } = businessQueries.images(businessId);

  return useMutation({
    mutationFn: (images: BusinessImage[]) =>
      businessesApi.reorderImages(
        businessId,
        images.map(({ id }) => id),
      ),
    onMutate: (images) => {
      const previous = queryClient.getQueryData(queryKey);
      queryClient.setQueryData(queryKey, images);
      return { previous };
    },
    onError: (_error, _images, context) => queryClient.setQueryData(queryKey, context?.previous),
  });
};

export const useDeleteBusinessImage = (businessId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId: string) => businessesApi.deleteImage(businessId, imageId),
    onSuccess: (_result, imageId) =>
      queryClient.setQueryData(businessQueries.images(businessId).queryKey, (images: BusinessImage[] = []) =>
        images.filter((image) => image.id !== imageId),
      ),
  });
};
