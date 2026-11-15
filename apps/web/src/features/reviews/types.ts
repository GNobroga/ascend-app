export const ReviewStatus = {
  PUBLISHED: 'published',
  HIDDEN: 'hidden',
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export type ReviewParty = {
  id: string;
  name: string;
};

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  reply: string | null;
  repliedAt: string | null;
  customer: ReviewParty;
  professional: ReviewParty | null;
  appointmentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RatingSummary = {
  average: number | null;
  count: number;
};

export type ProfessionalRating = RatingSummary & {
  professionalId: string;
};

export type BusinessRatings = {
  business: RatingSummary;
  professionals: ProfessionalRating[];
};
