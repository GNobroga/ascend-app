export const AppointmentPaymentStatus = {
    UNPAID: 'unpaid',
    PARTIAL: 'partial',
    PAID: 'paid',
} as const;

export type AppointmentPaymentStatus = (typeof AppointmentPaymentStatus)[keyof typeof AppointmentPaymentStatus];
