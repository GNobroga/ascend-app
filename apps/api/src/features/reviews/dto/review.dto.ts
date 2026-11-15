import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ReviewStatus } from '../../../common/enums/review-status.enum.js';
import { CursorPaginationQueryDto } from '../../../common/http/cursor-pagination-query.dto.js';
import type { ReviewEntity } from '../../../database/entities/review.entity.js';

const STATUSES = Object.values(ReviewStatus);
const TEXT_MAX_LENGTH = 2000;

export class UpsertReviewDto {
    @ApiProperty({ description: 'Nota inteira de 1 a 5.', minimum: 1, maximum: 5, example: 5 })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: TEXT_MAX_LENGTH, description: '`null` remove o comentário.', example: 'Corte impecável, atendimento pontual.' })
    @IsOptional()
    @IsString()
    @MaxLength(TEXT_MAX_LENGTH)
    comment?: string | null;
}

export class ReviewListQueryDto extends CursorPaginationQueryDto {
    @ApiPropertyOptional({ format: 'uuid', description: 'Só as avaliações deste profissional.' })
    @IsOptional()
    @IsUUID()
    professionalId?: string;

    @ApiPropertyOptional({ minimum: 1, maximum: 5, description: 'Só as avaliações com esta nota.' })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    rating?: number;

    @ApiPropertyOptional({ enum: STATUSES, description: 'Só publicadas ou só ocultas; omitido traz todas.' })
    @IsOptional()
    @IsIn(STATUSES)
    status?: ReviewStatus;
}

export class UpdateReviewStatusDto {
    @ApiProperty({ enum: STATUSES, description: '`hidden` esconde o comentário na página pública; a nota continua aparecendo e contando na média.' })
    @IsIn(STATUSES)
    status: ReviewStatus;
}

export class ReviewReplyDto {
    @ApiProperty({ maxLength: TEXT_MAX_LENGTH, example: 'Obrigado, Clara! Te esperamos de volta.' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(TEXT_MAX_LENGTH)
    reply: string;
}

export class ReviewPartyDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Clara Cliente' })
    name: string;
}

export class ReviewResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
    rating: number;

    @ApiProperty({ type: String, nullable: true, description: 'Sempre visível para a equipe, mesmo `hidden`.', example: 'Corte impecável, atendimento pontual.' })
    comment: string | null;

    @ApiProperty({ enum: STATUSES })
    status: ReviewStatus;

    @ApiProperty({ type: String, nullable: true, example: 'Obrigado, Clara! Te esperamos de volta.' })
    reply: string | null;

    @ApiProperty({ type: String, format: 'date-time', nullable: true })
    repliedAt: Date | null;

    @ApiProperty({ type: ReviewPartyDto })
    customer: ReviewPartyDto;

    @ApiProperty({ type: ReviewPartyDto, nullable: true, description: '`name` é o nome de exibição do profissional que atendeu.' })
    professional: ReviewPartyDto | null;

    @ApiProperty({ type: String, format: 'uuid', nullable: true })
    appointmentId: string | null;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    @ApiProperty({ format: 'date-time', description: 'Última edição do cliente, moderação ou resposta.' })
    updatedAt: Date;

    static from(review: ReviewEntity): ReviewResponseDto {
        const dto = new ReviewResponseDto();
        dto.id = review.id;
        dto.rating = review.rating;
        dto.comment = review.comment;
        dto.status = review.status;
        dto.reply = review.reply;
        dto.repliedAt = review.repliedAt;
        dto.customer = { id: review.customer.id, name: review.customer.name };
        dto.professional = review.professional && { id: review.professional.id, name: review.professional.displayName };
        dto.appointmentId = review.appointment?.id ?? null;
        dto.createdAt = review.createdAt;
        dto.updatedAt = review.updatedAt;
        return dto;
    }
}

export class MyReviewResponseDto {
    @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
    rating: number;

    @ApiProperty({ type: String, nullable: true, example: 'Corte impecável, atendimento pontual.' })
    comment: string | null;

    @ApiProperty({ type: String, nullable: true, description: 'Resposta do negócio.', example: 'Obrigado, Clara! Te esperamos de volta.' })
    reply: string | null;

    @ApiProperty({ format: 'date-time' })
    updatedAt: Date;

    static from(review: ReviewEntity): MyReviewResponseDto {
        const dto = new MyReviewResponseDto();
        dto.rating = review.rating;
        dto.comment = review.comment;
        dto.reply = review.reply;
        dto.updatedAt = review.updatedAt;
        return dto;
    }
}

export class PublicReviewListQueryDto extends CursorPaginationQueryDto {
    @ApiPropertyOptional({ format: 'uuid', description: 'Só as avaliações deste profissional.' })
    @IsOptional()
    @IsUUID()
    professionalId?: string;
}

export class PublicReviewDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
    rating: number;

    @ApiProperty({ type: String, nullable: true, description: '`null` se o cliente não comentou ou se o negócio ocultou o comentário.', example: 'Corte impecável, atendimento pontual.' })
    comment: string | null;

    @ApiProperty({ description: 'Só o primeiro nome do cliente.', example: 'Clara' })
    customerFirstName: string;

    @ApiProperty({ type: String, nullable: true, description: 'Nome de exibição do profissional que atendeu.', example: 'Paulo' })
    professionalName: string | null;

    @ApiProperty({ type: String, nullable: true, example: 'Obrigado, Clara! Te esperamos de volta.' })
    reply: string | null;

    @ApiProperty({ type: String, format: 'date-time', nullable: true })
    repliedAt: Date | null;

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(review: ReviewEntity): PublicReviewDto {
        const dto = new PublicReviewDto();
        dto.id = review.id;
        dto.rating = review.rating;
        dto.comment = review.status === ReviewStatus.HIDDEN ? null : review.comment;
        dto.customerFirstName = review.customer.name.trim().split(/\s+/)[0];
        dto.professionalName = review.professional?.displayName ?? null;
        dto.reply = review.reply;
        dto.repliedAt = review.repliedAt;
        dto.createdAt = review.createdAt;
        return dto;
    }
}

export class RatingSummaryDto {
    @ApiProperty({ type: Number, nullable: true, description: 'Média das notas com 1 casa decimal, inclusive das avaliações com comentário oculto; `null` sem avaliações.', example: 4.6 })
    average: number | null;

    @ApiProperty({ minimum: 0, example: 12 })
    count: number;
}

export class ProfessionalRatingDto extends RatingSummaryDto {
    @ApiProperty({ format: 'uuid' })
    professionalId: string;
}

export class BusinessRatingsResponseDto {
    @ApiProperty({ type: RatingSummaryDto, description: 'Todas as avaliações do negócio.' })
    business: RatingSummaryDto;

    @ApiProperty({ type: [ProfessionalRatingDto], description: 'Só os profissionais com ao menos uma avaliação.' })
    professionals: ProfessionalRatingDto[];
}
