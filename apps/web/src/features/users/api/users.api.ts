import { api } from '@/shared/api/http';
import type { User } from '../types';

export type UpdateProfileRequest = {
  name?: string;
  phone?: string | null;
};

export const usersApi = {
  getMe: () => api.get<User>('/users/me'),
  updateProfile: (body: UpdateProfileRequest) => api.patch<User>('/users/me', body),
  setPhoto: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.put<User>('/users/me/photo', form);
  },
  removePhoto: () => api.delete<void>('/users/me/photo'),
};
