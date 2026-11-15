export const CommissionMode = {
    PACKAGE: 'package',
    PRORATED: 'prorated',
} as const;

export type CommissionMode = (typeof CommissionMode)[keyof typeof CommissionMode];
