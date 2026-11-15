import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs';
import { ReviewStatus } from './types';

export const RATINGS = [5, 4, 3, 2, 1] as const;

export const reviewListSearchParams = {
  rating: parseAsInteger,
  status: parseAsStringLiteral(Object.values(ReviewStatus)),
  professional: parseAsString,
};

export const loadReviewListSearchParams = createLoader(reviewListSearchParams);
