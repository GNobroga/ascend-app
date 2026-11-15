import { PublicReviewsController } from './public-reviews.controller.js';
import { MyReviewController, ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

export { ReviewEvent, type ReviewCreatedEvent } from './review-events.js';

export const reviewsControllers = [ReviewsController, MyReviewController, PublicReviewsController];
export const reviewsProviders = [ReviewsService];
