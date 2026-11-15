export const CustomerBlockType = {
    TEMPORARY: 'temporary',
    FEE: 'fee',
} as const;

export type CustomerBlockType = (typeof CustomerBlockType)[keyof typeof CustomerBlockType];
