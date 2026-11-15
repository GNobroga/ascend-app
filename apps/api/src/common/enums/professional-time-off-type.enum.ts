export const ProfessionalTimeOffType = {
    VACATION: 'vacation',
    DAY_OFF: 'day_off',
    SICK_LEAVE: 'sick_leave',
    PERSONAL: 'personal',
    OTHER: 'other',
} as const;

export type ProfessionalTimeOffType = (typeof ProfessionalTimeOffType)[keyof typeof ProfessionalTimeOffType];
