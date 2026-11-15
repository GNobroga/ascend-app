export const ReviewType = {
    BUSINESS: 'business',
    PROFESSIONAL: 'professional',
    APPOINTMENT: 'appointment',
} as const;

export type ReviewType = (typeof ReviewType)[keyof typeof ReviewType];
