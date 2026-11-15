import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../../common/auth/public.decorator.js';
import { ApiCursorPaginatedResponse, ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { encodeCursor } from '../../common/utilities/cursor.js';
import { BusinessesService } from '../businesses/index.js';
import { BusinessRatingsResponseDto, PublicReviewDto, PublicReviewListQueryDto } from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

const BUSINESS_NOT_FOUND = 'Negócio inexistente ou inativo (`BUSINESS_NOT_FOUND`).';

@ApiTags('public')
@IsPublic()
@Controller('/api/public/businesses')
export class PublicReviewsController {

    constructor(
        private readonly reviews: ReviewsService,
        private readonly businesses: BusinessesService,
    ) { }

    @Get(':slug/reviews')
    @ApiOperation({ summary: 'Avaliações públicas do negócio', description: 'Mais recentes primeiro, paginadas por cursor. Comentário oculto pelo negócio vem `null`; a nota e a resposta continuam.' })
    @ApiParam({ name: 'slug', example: 'barbearia-do-joao' })
    @ApiCursorPaginatedResponse(PublicReviewDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida (`VALIDATION_ERROR`) ou cursor inválido (`INVALID_CURSOR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, BUSINESS_NOT_FOUND)
    async list(@Param('slug') slug: string, @Query() query: PublicReviewListQueryDto): Promise<ApiResponse<PublicReviewDto[]>> {
        const business = await this.businesses.getActiveBySlug(slug);
        const reviews = await this.reviews.listForBusiness(business.id, query);
        return ApiResponse.cursorPaginated(reviews.map((r) => PublicReviewDto.from(r)), query, (last) => encodeCursor({ at: last.createdAt, id: last.id }));
    }

    @Get(':slug/ratings')
    @ApiOperation({ summary: 'Médias de avaliação', description: 'Média e quantidade do negócio e de cada profissional avaliado.' })
    @ApiParam({ name: 'slug', example: 'barbearia-do-joao' })
    @ApiDataResponse(BusinessRatingsResponseDto)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, BUSINESS_NOT_FOUND)
    async ratings(@Param('slug') slug: string): Promise<ApiResponse<BusinessRatingsResponseDto>> {
        const business = await this.businesses.getActiveBySlug(slug);
        return ApiResponse.of(await this.reviews.ratings(business.id));
    }
}
