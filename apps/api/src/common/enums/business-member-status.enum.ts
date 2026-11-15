export const BusinessMemberStatus = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
} as const;

export type BusinessMemberStatus = (typeof BusinessMemberStatus)[keyof typeof BusinessMemberStatus];
