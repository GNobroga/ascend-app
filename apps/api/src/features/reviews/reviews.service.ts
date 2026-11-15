import { HttpStatus, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum.js';
import { ReviewStatus } from '../../common/enums/review-status.enum.js';
import { ReviewType } from '../../common/enums/review-type.enum.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { decodeCursor } from '../../common/utilities/cursor.js';
import { ReviewEntity } from '../../database/entities/review.entity.js';
import { AppointmentsService } from '../appointments/index.js';
import type { ReviewListQueryDto, UpsertReviewDto } from './dto/review.dto.js';
import { ReviewEvent, type ReviewCreatedEvent } from './review-events.js';

export interface RatingSummary {
    average: number | null;
    count: number;
}

const UNIQUE_VIOLATION = '23505';
const REVIEW_RELATIONS = { customer: true, professional: true, appointment: true } as const;

@Injectable()
export class ReviewsService {

    constructor(
        @InjectRepository(ReviewEntity) private readonly reviews: Repository<ReviewEntity>,
        private readonly appointments: AppointmentsService,
        private readonly events: EventEmitter2,
    ) { }

    async upsertForCustomer(userId: string, appointmentId: string, dto: UpsertReviewDto): Promise<ReviewEntity> {
        const appointment = await this.appointments.getForCustomer(userId, appointmentId);
        if (appointment.status !== AppointmentStatus.COMPLETED) {
            throw new AppException(ErrorCode.REVIEW_NOT_ALLOWED, HttpStatus.CONFLICT, 'Só atendimentos concluídos podem ser avaliados.');
        }
        if (!AppointmentsService.reviewableUntil(appointment)) {
            throw new AppException(ErrorCode.REVIEW_WINDOW_CLOSED, HttpStatus.CONFLICT, 'O prazo para avaliar este atendimento já passou.');
        }

        const fields = { rating: dto.rating, comment: dto.comment?.trim() || null };
        const businessId = appointment.customer.business.id;
        const updated = await this.reviews.update({ appointment: { id: appointmentId } }, fields);
        if (!updated.affected) {
            try {
                const { identifiers: [{ id }] } = await this.reviews.insert({
                    type: ReviewType.APPOINTMENT,
                    business: { id: businessId },
                    customer: { id: appointment.customer.id },
                    professional: { id: appointment.professional.id },
                    appointment: { id: appointmentId },
                    ...fields,
                });
                this.events.emit(ReviewEvent.CREATED, { reviewId: id as string, appointmentId, businessId, rating: dto.rating } satisfies ReviewCreatedEvent);
            } catch (error) {
                if (!(error instanceof QueryFailedError && (error.driverError as { code?: string }).code === UNIQUE_VIOLATION)) {
                    throw error;
                }
                await this.reviews.update({ appointment: { id: appointmentId } }, fields);
            }
        }
        return this.reviews.findOneOrFail({ where: { appointment: { id: appointmentId } }, relations: REVIEW_RELATIONS });
    }

    async ratings(businessId: string): Promise<{ business: RatingSummary; professionals: (RatingSummary & { professionalId: string })[] }> {
        const base = () => this.reviews.createQueryBuilder('review')
            .select('AVG(review.rating)', 'average')
            .addSelect('COUNT(*)', 'count')
            .where('review.business = :businessId', { businessId });

        const [business, professionals] = await Promise.all([
            base().getRawOne<{ average: string | null; count: string }>(),
            base()
                .addSelect('"review"."professionalId"', 'professionalId')
                .andWhere('"review"."professionalId" IS NOT NULL')
                .groupBy('"review"."professionalId"')
                .getRawMany<{ average: string; count: string; professionalId: string }>(),
        ]);
        return {
            business: ReviewsService.toSummary(business!),
            professionals: professionals.map((row) => ({ professionalId: row.professionalId, ...ReviewsService.toSummary(row) })),
        };
    }

    listForBusiness(businessId: string, query: Pick<ReviewListQueryDto, 'cursor' | 'limit' | 'professionalId' | 'rating' | 'status'>): Promise<ReviewEntity[]> {
        const after = query.cursor === undefined ? null : decodeCursor(query.cursor);
        if (query.cursor !== undefined && !after) {
            throw new AppException(ErrorCode.INVALID_CURSOR, HttpStatus.BAD_REQUEST, 'Cursor inválido.');
        }

        const qb = this.reviews.createQueryBuilder('review')
            .withDeleted()
            .innerJoinAndSelect('review.customer', 'customer')
            .leftJoinAndSelect('review.professional', 'professional')
            .leftJoinAndSelect('review.appointment', 'appointment')
            .where('review.business = :businessId', { businessId })
            .orderBy("date_trunc('milliseconds', review.createdAt)", 'DESC')
            .addOrderBy('review.id', 'DESC')
            .limit(query.limit + 1);
        if (query.professionalId) {
            qb.andWhere('review.professional = :professionalId', { professionalId: query.professionalId });
        }
        if (query.rating) {
            qb.andWhere('review.rating = :rating', { rating: query.rating });
        }
        if (query.status) {
            qb.andWhere('review.status = :status', { status: query.status });
        }
        if (after) {
            qb.andWhere("(date_trunc('milliseconds', review.createdAt), review.id) < (:at, :id)", { at: after.at, id: after.id });
        }
        return qb.getMany();
    }

    async setStatus(businessId: string, id: string, status: ReviewStatus): Promise<ReviewEntity> {
        await this.getById(businessId, id);
        await this.reviews.update({ id }, { status });
        return this.getById(businessId, id);
    }

    async setReply(businessId: string, id: string, reply: string): Promise<ReviewEntity> {
        await this.getById(businessId, id);
        await this.reviews.update({ id }, { reply: reply.trim(), repliedAt: new Date() });
        return this.getById(businessId, id);
    }

    async removeReply(businessId: string, id: string): Promise<void> {
        await this.getById(businessId, id);
        await this.reviews.update({ id }, { reply: null, repliedAt: null });
    }

    private static toSummary(row: { average: string | null; count: string }): RatingSummary {
        return { average: row.average === null ? null : Math.round(Number(row.average) * 10) / 10, count: Number(row.count) };
    }

    private async getById(businessId: string, id: string): Promise<ReviewEntity> {
        const review = await this.reviews.findOne({ where: { id, business: { id: businessId } }, relations: REVIEW_RELATIONS, withDeleted: true });
        if (!review) {
            throw new AppException(ErrorCode.REVIEW_NOT_FOUND, HttpStatus.NOT_FOUND, 'Avaliação não encontrada.');
        }
        return review;
    }
}
