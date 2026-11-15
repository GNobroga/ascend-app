import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiCursorPaginatedResponse, ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { encodeCursor } from '../../common/utilities/cursor.js';
import { BUSINESS_ID_PARAM, BusinessAccess } from '../businesses/index.js';
import {
    MyReviewResponseDto,
    ReviewListQueryDto,
    ReviewReplyDto,
    ReviewResponseDto,
    UpdateReviewStatusDto,
    UpsertReviewDto,
} from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const REVIEW_NOT_FOUND = 'Avaliação não encontrada neste negócio (`REVIEW_NOT_FOUND`).';
const INVALID_ID = '`reviewId` não é UUID (`VALIDATION_ERROR`).';

@ApiTags('reviews')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/reviews`)
export class ReviewsController {

    constructor(private readonly reviews: ReviewsService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Avaliações do negócio', description: 'Mais recentes primeiro, paginadas por cursor. Traz o comentário mesmo das ocultas.' })
    @ApiCursorPaginatedResponse(ReviewResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida (`VALIDATION_ERROR`) ou cursor inválido (`INVALID_CURSOR`).')
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @Query() query: ReviewListQueryDto): Promise<ApiResponse<ReviewResponseDto[]>> {
        const reviews = await this.reviews.listForBusiness(businessId, query);
        return ApiResponse.cursorPaginated(reviews.map((r) => ReviewResponseDto.from(r)), query, (last) => encodeCursor({ at: last.createdAt, id: last.id }));
    }

    @Patch(':reviewId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Oculta ou publica o comentário', description: '`hidden` tira o comentário da página pública; a nota continua aparecendo e contando na média. Editar o comentário não reabre a avaliação.' })
    @ApiDataResponse(ReviewResponseDto, { description: 'Avaliação atualizada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, `Dados inválidos ou ${INVALID_ID}`)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, REVIEW_NOT_FOUND)
    async setStatus(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('reviewId') reviewId: string,
        @Body() dto: UpdateReviewStatusDto,
    ): Promise<ApiResponse<ReviewResponseDto>> {
        return ApiResponse.of(ReviewResponseDto.from(await this.reviews.setStatus(businessId, reviewId, dto.status)));
    }

    @Put(':reviewId/reply')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Escreve ou edita a resposta do negócio', description: 'A resposta aparece abaixo da avaliação na página pública, mesmo com o comentário oculto.' })
    @ApiDataResponse(ReviewResponseDto, { description: 'Avaliação com a resposta.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, `Dados inválidos ou ${INVALID_ID}`)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, REVIEW_NOT_FOUND)
    async setReply(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('reviewId') reviewId: string,
        @Body() dto: ReviewReplyDto,
    ): Promise<ApiResponse<ReviewResponseDto>> {
        return ApiResponse.of(ReviewResponseDto.from(await this.reviews.setReply(businessId, reviewId, dto.reply)));
    }

    @Delete(':reviewId/reply')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Remove a resposta do negócio' })
    @ApiNoContentResponse({ description: 'Resposta removida.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_ID)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, REVIEW_NOT_FOUND)
    async removeReply(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('reviewId') reviewId: string): Promise<void> {
        await this.reviews.removeReply(businessId, reviewId);
    }
}

@ApiTags('me')
@ApiCookieAuth()
@Controller('/api/me/appointments/:appointmentId/review')
export class MyReviewController {

    constructor(private readonly reviews: ReviewsService) { }

    @Put()
    @ApiOperation({
        summary: 'Avalia o atendimento',
        description: 'Cria ou edita a avaliação do agendamento: só `completed` e até 30 dias depois do fim. Uma avaliação por agendamento; a nota conta para o negócio e para o profissional.',
    })
    @ApiDataResponse(MyReviewResponseDto, { description: 'Avaliação gravada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `appointmentId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Access token ausente ou inválido (`UNAUTHENTICATED`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Agendamento não encontrado entre os do usuário (`APPOINTMENT_NOT_FOUND`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Atendimento não concluído (`REVIEW_NOT_ALLOWED`) ou prazo de 30 dias encerrado (`REVIEW_WINDOW_CLOSED`).')
    async upsert(
        @CurrentUser('id') userId: string,
        @UuidParam('appointmentId') appointmentId: string,
        @Body() dto: UpsertReviewDto,
    ): Promise<ApiResponse<MyReviewResponseDto>> {
        return ApiResponse.of(MyReviewResponseDto.from(await this.reviews.upsertForCustomer(userId, appointmentId, dto)));
    }
}
