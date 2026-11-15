import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { RateLimit } from '../../common/throttling/rate-limit.decorator.js';
import { PostalCodeParamDto } from './dto/postal-code-param.dto.js';
import { PostalCodeResponseDto } from './dto/postal-code-response.dto.js';
import { PostalCodesService } from './postal-codes.service.js';

const MINUTE_MS = 60 * 1000;

@ApiTags('postal-codes')
@ApiCookieAuth()
@Controller('/api/postal-codes')
export class PostalCodesController {

    constructor(private readonly postalCodes: PostalCodesService) { }

    @Get(':postalCode')
    @RateLimit(30, MINUTE_MS)
    @ApiOperation({ summary: 'Consulta um CEP', description: 'Devolve o endereço do CEP para preencher formulários. CEP geral de cidade vem sem `street` e `district`. O resultado fica em cache.' })
    @ApiDataResponse(PostalCodeResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'CEP sem 8 dígitos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Access token ausente ou inválido (`UNAUTHENTICATED`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'CEP não existe (`POSTAL_CODE_NOT_FOUND`).')
    @ApiErrorResponse(HttpStatus.BAD_GATEWAY, 'O serviço de CEP não respondeu (`POSTAL_CODE_UNAVAILABLE`).')
    async lookup(@Param() { postalCode }: PostalCodeParamDto): Promise<ApiResponse<PostalCodeResponseDto>> {
        return ApiResponse.of(PostalCodeResponseDto.from(await this.postalCodes.lookup(postalCode)));
    }
}
