import type { BusinessMemberStatus, Weekday } from '@/features/businesses';

export type ProfessionalServiceLink = {
  serviceId: string;
  name: string;
  commissionPercent: number | null;
};

export type ProfessionalPackageLink = {
  packageId: string;
  name: string;
  commissionPercent: number | null;
};

export type Specialty = {
  id: string;
  name: string;
  description: string | null;
};

export type Professional = {
  id: string;
  memberId: string;
  memberStatus: BusinessMemberStatus;
  displayName: string;
  bio: string | null;
  photoUrl: string | null;
  commissionPercent: number;
  services: ProfessionalServiceLink[];
  packages: ProfessionalPackageLink[];
  specialties: Specialty[];
  createdAt: string;
};

export const ProfessionalTimeOffType = {
  VACATION: 'vacation',
  DAY_OFF: 'day_off',
  SICK_LEAVE: 'sick_leave',
  PERSONAL: 'personal',
  OTHER: 'other',
} as const;

export type ProfessionalTimeOffType = (typeof ProfessionalTimeOffType)[keyof typeof ProfessionalTimeOffType];

export type ProfessionalTimeOff = {
  id: string;
  startAt: string;
  endAt: string;
  type: ProfessionalTimeOffType;
  reason: string | null;
};

export type ProfessionalWorkingHour = {
  dayOfWeek: Weekday;
  isDayOff: boolean;
  startTime: string | null;
  endTime: string | null;
};
