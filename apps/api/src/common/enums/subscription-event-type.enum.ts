export const SubscriptionEventType = {
    TRIAL_STARTED: 'trial_started',
    ACTIVATION_BONUS_GRANTED: 'activation_bonus_granted',
} as const;

export type SubscriptionEventType = (typeof SubscriptionEventType)[keyof typeof SubscriptionEventType];
