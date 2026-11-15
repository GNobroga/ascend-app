export const SocialNetwork = {
    INSTAGRAM: 'instagram',
    FACEBOOK: 'facebook',
    TIKTOK: 'tiktok',
    YOUTUBE: 'youtube',
    X: 'x',
    LINKEDIN: 'linkedin',
    WEBSITE: 'website',
} as const;

export type SocialNetwork = (typeof SocialNetwork)[keyof typeof SocialNetwork];
