import { HttpStatus } from '@nestjs/common';
import { AppException } from '../errors/app.exception.js';
import { ErrorCode } from '../errors/error-code.enum.js';

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DAYS_IN_WEEK = 7;

export interface TimeRange {
    start: string;
    end: string;
}

export const toHourMinute = (time: string): string => time.slice(0, 5);

export const ensureEndsAfterStart = (ranges: (TimeRange & { path: string })[]): void => {
    const details = ranges
        .filter(({ start, end }) => toHourMinute(end) <= toHourMinute(start))
        .map(({ path }) => ({ path, message: `${path.split('.').pop()} must be after the start time` }));

    if (details.length) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, HttpStatus.BAD_REQUEST, 'Dados inválidos.', details);
    }
};
