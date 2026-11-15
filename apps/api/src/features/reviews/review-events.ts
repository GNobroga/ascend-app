export const ReviewEvent = {
    CREATED: 'review.created',
} as const;

export interface ReviewCreatedEvent {
    reviewId: string;
    appointmentId: string;
    businessId: string;
    rating: number;
}
