export type User = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  photoUrl: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
  hasPassword: boolean;
  createdAt: string;
};
