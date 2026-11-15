import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { userQueries } from '@/features/users';
import { hasErrorCode } from '@/shared/api/api-error';
import { ErrorCode } from '@/shared/api/error-code';
import { withRedirectTo } from '@/shared/lib/redirect-path';
import { authApi } from './auth.api';

type MutationCallbacks = {
  onError?: (error: Error) => void;
};

export const useLogin = ({ onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (user) => queryClient.setQueryData(userQueries.me().queryKey, user),
    onError,
  });
};

export const useRegister = ({ onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (user) => queryClient.setQueryData(userQueries.me().queryKey, user),
    onError,
  });
};

export const useForgotPassword = ({ onError }: MutationCallbacks = {}) =>
  useMutation({
    mutationFn: authApi.forgotPassword,
    onError,
  });

type LogoutOptions = {
  redirectTo?: string;
};

export const useLogout = ({ redirectTo }: LogoutOptions = {}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userQueries.me().queryKey, refetchType: 'none' });
      await navigate(withRedirectTo('/login', redirectTo), { replace: true });
      queryClient.clear();
    },
  });
};

export const useResetPassword =({ onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => queryClient.clear(),
    onError,
  });
};

export const useChangePassword = ({ onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQueries.me().queryKey }),
    onError,
  });
};

export const useResendEmailVerification = ({ onError }: MutationCallbacks = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.resendEmailVerification,
    onError: (error) => {
      if (hasErrorCode(error, ErrorCode.EMAIL_ALREADY_VERIFIED)) {
        void queryClient.invalidateQueries({ queryKey: userQueries.me().queryKey });
      }
      onError?.(error);
    },
  });
};
