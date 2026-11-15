import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess, CurrentMembership, type BusinessMembership } from '../businesses/index.js';
import { CreatePaymentDto, PaymentActionDto, PaymentResponseDto } from './dto/payment.dto.js';
import { PaymentsService } from './payments.service.js';

const APPOINTMENT_NOT_FOUND = 'Agendamento não encontrado neste negócio (`APPOINTMENT_NOT_FOUND`).';
const PAYMENT_NOT_FOUND = `${APPOINTMENT_NOT_FOUND} Pagamento não encontrado neste agendamento (\`PAYMENT_NOT_FOUND\`).`;
const OWN_ONLY = 'Quem é só `professional` mexe apenas nos pagamentos dos próprios agendamentos (`INSUFFICIENT_BUSINESS_ROLE`).';
const INVALID_IDS = 'Id que não é UUID (`VALIDATION_ERROR`).';
const NOT_PAID = 'Pagamento que não está `paid` (`INVALID_PAYMENT_TRANSITION`).';

@ApiTags('payments')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/appointments/:appointmentId/payments`)
export class PaymentsController {

    constructor(private readonly payments: PaymentsService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Pagamentos do agendamento', description: 'Do mais antigo ao mais novo, inclusive estornados e cancelados.' })
    @ApiDataResponse(PaymentResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_IDS)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, APPOINTMENT_NOT_FOUND)
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('appointmentId') appointmentId: string): Promise<ApiResponse<PaymentResponseDto[]>> {
        const payments = await this.payments.list(businessId, appointmentId);
        return ApiResponse.of(payments.map((p) => PaymentResponseDto.from(p)));
    }

    @Post()
    @BusinessAccess()
    @ApiOperation({
        summary: 'Registra um pagamento recebido',
        description: 'Nasce `paid`. A soma dos pagamentos `paid` não pode passar do `totalPrice` do agendamento. Não muda o status do agendamento.',
    })
    @ApiDataResponse(PaymentResponseDto, { status: HttpStatus.CREATED, description: 'Pagamento registrado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou id que não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWN_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, `${APPOINTMENT_NOT_FOUND} Forma de pagamento ativa não encontrada (\`PAYMENT_METHOD_NOT_FOUND\`).`)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Valor maior que o saldo (`PAYMENT_EXCEEDS_BALANCE`) ou agendamento cancelado (`PAYMENT_NOT_ALLOWED`).')
    async create(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @UuidParam('appointmentId') appointmentId: string,
        @Body() dto: CreatePaymentDto,
    ): Promise<ApiResponse<PaymentResponseDto>> {
        return ApiResponse.of(PaymentResponseDto.from(await this.payments.create(businessId, actor, appointmentId, dto)));
    }

    @Post(':paymentId/refund')
    @HttpCode(HttpStatus.OK)
    @BusinessAccess()
    @ApiOperation({ summary: 'Estorna um pagamento', description: 'O valor inteiro volta ao cliente (`paid → refunded`) e deixa de contar no recebido. O motivo vai para as observações.' })
    @ApiDataResponse(PaymentResponseDto, { description: 'Pagamento estornado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou id que não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWN_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PAYMENT_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, NOT_PAID)
    async refund(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @UuidParam('appointmentId') appointmentId: string,
        @UuidParam('paymentId') paymentId: string,
        @Body() dto: PaymentActionDto,
    ): Promise<ApiResponse<PaymentResponseDto>> {
        return ApiResponse.of(PaymentResponseDto.from(await this.payments.refund(businessId, actor, appointmentId, paymentId, dto.reason)));
    }

    @Post(':paymentId/cancel')
    @HttpCode(HttpStatus.OK)
    @BusinessAccess()
    @ApiOperation({ summary: 'Cancela um lançamento', description: 'Para lançamento feito por engano: o dinheiro nunca entrou (`paid → cancelled`). O motivo vai para as observações.' })
    @ApiDataResponse(PaymentResponseDto, { description: 'Lançamento cancelado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou id que não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWN_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PAYMENT_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, NOT_PAID)
    async cancel(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @UuidParam('appointmentId') appointmentId: string,
        @UuidParam('paymentId') paymentId: string,
        @Body() dto: PaymentActionDto,
    ): Promise<ApiResponse<PaymentResponseDto>> {
        return ApiResponse.of(PaymentResponseDto.from(await this.payments.cancel(businessId, actor, appointmentId, paymentId, dto.reason)));
    }
}
