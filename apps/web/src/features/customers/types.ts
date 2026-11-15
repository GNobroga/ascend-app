export const CustomerBlockType = {
  TEMPORARY: 'temporary',
  FEE: 'fee',
} as const;

export type CustomerBlockType = (typeof CustomerBlockType)[keyof typeof CustomerBlockType];

export type CustomerBlock = {
  type: CustomerBlockType;
  reason: string | null;
  until: string | null;
  feeAmount: number | null;
  createdAt: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  whatsappOptedOutAt: string | null;
  hasAccount: boolean;
  activeBlock: CustomerBlock | null;
  noShowCount: number;
  createdAt: string;
};

export const DuplicateField = {
  EMAIL: 'email',
  PHONE: 'phone',
} as const;

export type DuplicateField = (typeof DuplicateField)[keyof typeof DuplicateField];

export type PossibleDuplicateGroup = {
  field: DuplicateField;
  value: string;
  customers: Customer[];
};
