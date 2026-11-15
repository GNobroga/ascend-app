export const BusinessMemberRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  PROFESSIONAL: 'professional',
} as const;

export type BusinessMemberRole = (typeof BusinessMemberRole)[keyof typeof BusinessMemberRole];

export const BusinessMemberStatus = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
} as const;

export type BusinessMemberStatus = (typeof BusinessMemberStatus)[keyof typeof BusinessMemberStatus];

export type BusinessMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  photoUrl: string | null;
  status: BusinessMemberStatus;
  roles: BusinessMemberRole[];
  professionalId: string | null;
  joinedAt: string;
};

export type BusinessStatus = 'active' | 'inactive' | 'suspended';

export type BusinessAddress = {
  postalCode: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
};

export type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  email: string;
  taxId: string;
  phone: string | null;
  phoneIsWhatsApp: boolean;
  status: BusinessStatus;
  timezone: string;
  address: BusinessAddress;
  createdAt: string;
};

export type MyBusiness = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: BusinessStatus;
  roles: BusinessMemberRole[];
};

export const Weekday = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export type Weekday = (typeof Weekday)[keyof typeof Weekday];

export type BusinessHour = {
  dayOfWeek: Weekday;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

export type BusinessSettings = {
  slotIntervalMinutes: number;
  bufferMinutes: number;
  minimumAdvanceBookingMinutes: number;
  maximumAdvanceBookingDays: number;
  cancellationLimitHours: number;
  autoConfirmOnlineBookings: boolean;
  reminderHoursBefore: number;
  unblockFee: number;
};

export type PaymentMethod = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
};

export const BusinessImageType = {
  COVER: 'cover',
  GALLERY: 'gallery',
  INTERIOR: 'interior',
  EXTERIOR: 'exterior',
  WORK: 'work',
} as const;

export type BusinessImageType = (typeof BusinessImageType)[keyof typeof BusinessImageType];

export type BusinessImage = {
  id: string;
  url: string;
  altText: string | null;
  type: BusinessImageType;
  displayOrder: number;
  createdAt: string;
};
