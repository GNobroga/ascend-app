import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BusinessAccess } from './business-access.decorator.js';
import { BUSINESS_ID_PARAM } from './business-membership.js';
import { BusinessPaymentMethodsService, DEFAULT_PAYMENT_METHODS } from './business-payment-methods.service.js';
import {
    CreatePaymentMethodDto,
    PaymentMethodListQueryDto,
    PaymentMethodResponseDto,
    UpdatePaymentMethodDto,
} from './dto/business-payment-method.dto.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const NOT_FOUND = 'Forma de pagamento não encontrada neste negócio (`PAYMENT_METHOD_NOT_FOUND`).';

@ApiTags('payment-methods')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/payment-methods`)
export class BusinessPaymentMethodsController {

    constructor(private readonly methods: BusinessPaymentMethodsService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Lista as formas de pagamento', description: `Ordenadas por nome. O negócio nasce com ${DEFAULT_PAYMENT_METHODS.join(', ')}.` })
    @ApiDataResponse(PaymentMethodResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida (`VALIDATION_ERROR`).')
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @Query() query: PaymentMethodListQueryDto): Promise<ApiResponse<PaymentMethodResponseDto[]>> {
        const methods = await this.methods.list(businessId, query);
        return ApiResponse.of(methods.map((m) => PaymentMethodResponseDto.from(m)));
    }

    @Post()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Cria uma forma de pagamento' })
    @ApiDataResponse(PaymentMethodResponseDto, { status: HttpStatus.CREATED, description: 'Forma criada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    async create(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: CreatePaymentMethodDto): Promise<ApiResponse<PaymentMethodResponseDto>> {
        return ApiResponse.of(PaymentMethodResponseDto.from(await this.methods.create(businessId, dto)));
    }

    @Patch(':paymentMethodId')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Atualiza uma forma de pagamento', description: 'Só os campos enviados são alterados.' })
    @ApiDataResponse(PaymentMethodResponseDto, { description: 'Forma atualizada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `paymentMethodId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
    async update(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('paymentMethodId') paymentMethodId: string,
        @Body() dto: UpdatePaymentMethodDto,
    ): Promise<ApiResponse<PaymentMethodResponseDto>> {
        return ApiResponse.of(PaymentMethodResponseDto.from(await this.methods.update(businessId, paymentMethodId, dto)));
    }

    @Delete(':paymentMethodId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Exclui uma forma de pagamento', description: 'Exclusão lógica; pagamentos já lançados continuam apontando para ela.' })
    @ApiNoContentResponse({ description: 'Forma excluída.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`paymentMethodId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
    async remove(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('paymentMethodId') paymentMethodId: string): Promise<void> {
        await this.methods.remove(businessId, paymentMethodId);
    }
}
