export const BusinessImageType = {
    COVER: 'cover',
    GALLERY: 'gallery',
    INTERIOR: 'interior',
    EXTERIOR: 'exterior',
    WORK: 'work',
} as const;

export type BusinessImageType = (typeof BusinessImageType)[keyof typeof BusinessImageType];
