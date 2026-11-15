export const ReviewStatus = {
    PUBLISHED: 'published',
    HIDDEN: 'hidden',
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];
