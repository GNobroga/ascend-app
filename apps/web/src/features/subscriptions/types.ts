export type SubscriptionStatus = 'trialing' | 'active';

export type SubscriptionAccess = 'full' | 'restricted';

export type ActivationSteps = {
  businessHours: boolean;
  services: boolean;
  professionals: boolean;
  firstAppointment: boolean;
};

export type Subscription = {
  status: SubscriptionStatus;
  access: SubscriptionAccess;
  trialEndsAt: string;
  activation: {
    steps: ActivationSteps;
    bonusDays: number;
    bonusGrantedAt: string | null;
  };
};
