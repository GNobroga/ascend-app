import type { BusinessAddress, BusinessHour, BusinessImage } from '@/features/businesses';

export type PublicBusiness = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  email: string;
  phone: string | null;
  phoneIsWhatsApp: boolean;
  timezone: string;
  address: BusinessAddress;
  hours: BusinessHour[];
  images: BusinessImage[];
  socialLinks: PublicSocialLink[];
  onlineBookingAvailable: boolean;
};

export type PublicSocialLink = {
  network: string;
  url: string;
};

export type PublicImage = {
  url: string;
  altText: string | null;
};

export type PublicService = {
  id: string;
  name: string;
  description: string | null;
  durationInMinutes: number;
  price: number;
  images: PublicImage[];
};

export type PublicServiceCategory = {
  id: string;
  name: string;
  description: string | null;
  services: PublicService[];
};

export type PublicPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  servicesPrice: number;
  durationMinutes: number;
  services: Array<{ id: string; name: string }>;
  images: PublicImage[];
};

export type PublicCatalog = {
  categories: PublicServiceCategory[];
  uncategorized: PublicService[];
  packages: PublicPackage[];
};

export type PublicProfessional = {
  id: string;
  displayName: string;
  bio: string | null;
  photoUrl: string | null;
  specialties: string[];
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  customerFirstName: string;
  professionalName: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
};

export type PublicAvailabilitySlot = {
  startAt: string;
  endAt: string;
  professionalIds: string[];
};

export type PublicAvailability = {
  date: string;
  timezone: string;
  durationMinutes: number;
  slots: PublicAvailabilitySlot[];
};
