import type { AppointmentStatus } from '@/features/appointments';

export type MyAppointmentParty = {
  id: string;
  name: string;
};

export type MyAppointmentBusiness = {
  name: string;
  slug: string;
  logoUrl: string | null;
  timezone: string;
};

export type MyAppointmentService = {
  name: string;
  price: number;
  durationMinutes: number;
};

export type MyAppointmentReview = {
  rating: number;
  comment: string | null;
  reply: string | null;
};

export type MyAppointment = {
  id: string;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  totalPrice: number;
  package: MyAppointmentParty | null;
  business: MyAppointmentBusiness;
  professional: MyAppointmentParty;
  services: MyAppointmentService[];
  customerNotes: string | null;
  cancellationReason: string | null;
  cancellableUntil: string | null;
  review: MyAppointmentReview | null;
  reviewableUntil: string | null;
};

export type MyReview = {
  rating: number;
  comment: string | null;
  reply: string | null;
  updatedAt: string;
};
