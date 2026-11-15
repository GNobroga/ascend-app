export const PaymentEvent = {
    CHANGED: 'payment.changed',
} as const;

export interface PaymentChangedEvent {
    paymentId: string;
    appointmentId: string;
    businessId: string;
}
