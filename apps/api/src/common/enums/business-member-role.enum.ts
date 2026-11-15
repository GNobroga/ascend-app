export const BusinessMemberRole = {
    OWNER: 'owner',
    ADMIN: 'admin',
    PROFESSIONAL: 'professional',
} as const;

export type BusinessMemberRole = (typeof BusinessMemberRole)[keyof typeof BusinessMemberRole];
