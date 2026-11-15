import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User } from '../types';
import { usersApi } from './users.api';
import { userQueries } from './users.queries';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

const useSetMe = () => {
  const queryClient = useQueryClient();
  return (user: User) => queryClient.setQueryData(userQueries.me().queryKey, user);
};

export const useUpdateProfile = ({ onError }: MutationCallbacks = {}) => {
  const setMe = useSetMe();

  return useMutation({
    mutationFn: usersApi.updateProfile,
    onSuccess: setMe,
    onError,
  });
};

export const useSetProfilePhoto = () => {
  const setMe = useSetMe();

  return useMutation({
    mutationFn: usersApi.setPhoto,
    onSuccess: setMe,
  });
};

export const useRemoveProfilePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: usersApi.removePhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueries.me().queryKey }),
  });
};
