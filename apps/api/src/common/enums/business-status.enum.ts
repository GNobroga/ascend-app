export const BusinessStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
} as const;

export type BusinessStatus = (typeof BusinessStatus)[keyof typeof BusinessStatus];
