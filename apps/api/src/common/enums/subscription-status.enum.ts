export const SubscriptionStatus = {
    TRIALING: 'trialing',
    ACTIVE: 'active',
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
