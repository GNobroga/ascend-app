export const AppointmentOrigin = {
    TEAM: 'team',
    CUSTOMER: 'customer',
} as const;

export type AppointmentOrigin = (typeof AppointmentOrigin)[keyof typeof AppointmentOrigin];
