import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { ApiDataResponse, ApiErrorResponse, ApiPaginatedResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { UuidParam } from '../../common/pipes/uuid-param.decorator.js';
import { BUSINESS_ID_PARAM, BusinessAccess, BusinessesService, CurrentMembership, RequiresFullAccess, SUBSCRIPTION_RESTRICTED_DOC, type BusinessMembership } from '../businesses/index.js';
import { AppointmentsService } from './appointments.service.js';
import {
    AppointmentListQueryDto,
    AppointmentResponseDto,
    CancelMyAppointmentDto,
    ChangeAppointmentStatusDto,
    CreateAppointmentDto,
    CreateMyAppointmentDto,
    CustomerAppointmentListQueryDto,
    CustomerAppointmentSummaryDto,
    MyAppointmentListQueryDto,
    MyAppointmentResponseDto,
    RescheduleAppointmentDto,
    UpdateAppointmentServicesDto,
} from './dto/appointment.dto.js';

const APPOINTMENT_NOT_FOUND = 'Agendamento não encontrado (`APPOINTMENT_NOT_FOUND`).';
const OWN_ONLY = 'Quem é só `professional` gerencia apenas os próprios agendamentos (`INSUFFICIENT_BUSINESS_ROLE`).';
const SLOT_UNAVAILABLE = 'O atendimento não cabe no expediente ou conflita com ausência ou outro agendamento (`APPOINTMENT_SLOT_UNAVAILABLE`).';
const TRANSITIONS = 'Transições: `pending` → `confirmed`|`cancelled`; `confirmed` → `in_progress`|`completed`|`cancelled`|`no_show`; `in_progress` → `completed`. '
    + '`in_progress`, `completed` e `no_show` só a partir do início.';
const UNAUTHENTICATED = 'Access token ausente ou inválido (`UNAUTHENTICATED`).';

@ApiTags('appointments')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/appointments`)
export class AppointmentsController {

    constructor(
        private readonly businesses: BusinessesService,
        private readonly appointments: AppointmentsService,
    ) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({ summary: 'Agenda do negócio', description: 'Agendamentos que tocam o intervalo `from`–`to` (até 31 dias), ordenados por início. Inclui cancelados; filtre por `status` se precisar.' })
    @ApiDataResponse(AppointmentResponseDto, { isArray: true })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida ou intervalo maior que 31 dias (`VALIDATION_ERROR`).')
    async list(@Param(BUSINESS_ID_PARAM) businessId: string, @Query() query: AppointmentListQueryDto): Promise<ApiResponse<AppointmentResponseDto[]>> {
        const appointments = await this.appointments.listForTeam(businessId, query);
        return ApiResponse.of(appointments.map((a) => AppointmentResponseDto.from(a)));
    }

    @Get(':appointmentId')
    @BusinessAccess()
    @ApiOperation({ summary: 'Detalhes do agendamento', description: 'Inclui o histórico de status.' })
    @ApiDataResponse(AppointmentResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`appointmentId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, APPOINTMENT_NOT_FOUND)
    async findOne(@Param(BUSINESS_ID_PARAM) businessId: string, @UuidParam('appointmentId') appointmentId: string): Promise<ApiResponse<AppointmentResponseDto>> {
        return ApiResponse.of(AppointmentResponseDto.from(await this.appointments.getForTeam(businessId, appointmentId)));
    }

    @Post()
    @BusinessAccess()
    @RequiresFullAccess()
    @ApiOperation({
        summary: 'Agenda pela equipe',
        description: 'Nasce `confirmed`. O atendimento precisa caber no expediente e estar livre; grade e antecedência não valem (encaixe). Preço, duração e comissão são copiados dos serviços; com `packageId`, o preço do pacote é rateado entre os serviços dele.',
    })
    @ApiDataResponse(AppointmentResponseDto, { status: HttpStatus.CREATED, description: 'Agendamento criado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, ou nenhum ou ambos entre `serviceIds` e `packageId` (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWN_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Cliente (`CUSTOMER_NOT_FOUND`), serviço (`SERVICE_NOT_FOUND`), pacote (`PACKAGE_NOT_FOUND`) ou profissional apto (`PROFESSIONAL_NOT_FOUND`) não encontrado.')
    @ApiErrorResponse(HttpStatus.CONFLICT, SLOT_UNAVAILABLE)
    async create(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @CurrentUser('id') userId: string,
        @Body() dto: CreateAppointmentDto,
    ): Promise<ApiResponse<AppointmentResponseDto>> {
        const business = await this.businesses.getById(businessId);
        return ApiResponse.of(AppointmentResponseDto.from(await this.appointments.createByTeam(business, actor, userId, dto)));
    }

    @Patch(':appointmentId')
    @BusinessAccess()
    @ApiOperation({
        summary: 'Remarca ou edita o agendamento',
        description: 'Muda horário, profissional ou observações internas. Remarcar só em `pending`/`confirmed`; a duração e os serviços continuam os da reserva, e trocar o profissional recalcula a comissão.',
    })
    @ApiDataResponse(AppointmentResponseDto, { description: 'Agendamento atualizado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `appointmentId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWN_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, `${APPOINTMENT_NOT_FOUND} Profissional apto não encontrado (\`PROFESSIONAL_NOT_FOUND\`).`)
    @ApiErrorResponse(HttpStatus.CONFLICT, `${SLOT_UNAVAILABLE} Agendamento já encerrado (\`INVALID_STATUS_TRANSITION\`).`)
    async reschedule(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @CurrentUser('id') userId: string,
        @UuidParam('appointmentId') appointmentId: string,
        @Body() dto: RescheduleAppointmentDto,
    ): Promise<ApiResponse<AppointmentResponseDto>> {
        const business = await this.businesses.getById(businessId);
        return ApiResponse.of(AppointmentResponseDto.from(await this.appointments.reschedule(business, actor, userId, appointmentId, dto)));
    }

    @Put(':appointmentId/services')
    @BusinessAccess()
    @ApiOperation({
        summary: 'Altera os serviços do agendamento',
        description: 'Substitui a lista de serviços avulsos, mantendo o início. Só em `pending`/`confirmed` e fora de pacote. Recalcula o fim e o total; '
            + 'os serviços mantidos conservam preço e comissão da reserva. Adicionar exige que o profissional execute os novos serviços e que o atendimento mais longo caiba na agenda.',
    })
    @ApiDataResponse(AppointmentResponseDto, { description: 'Agendamento atualizado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `appointmentId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWN_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, `${APPOINTMENT_NOT_FOUND} Serviço (\`SERVICE_NOT_FOUND\`) ou profissional apto (\`PROFESSIONAL_NOT_FOUND\`) não encontrado.`)
    @ApiErrorResponse(HttpStatus.CONFLICT, `${SLOT_UNAVAILABLE} Agendamento já encerrado (\`INVALID_STATUS_TRANSITION\`), de pacote (\`APPOINTMENT_IS_PACKAGE\`) `
        + 'ou com novo total abaixo do já pago (`PAYMENT_EXCEEDS_BALANCE`).')
    async updateServices(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @UuidParam('appointmentId') appointmentId: string,
        @Body() dto: UpdateAppointmentServicesDto,
    ): Promise<ApiResponse<AppointmentResponseDto>> {
        const business = await this.businesses.getById(businessId);
        return ApiResponse.of(AppointmentResponseDto.from(await this.appointments.updateServices(business, actor, appointmentId, dto)));
    }

    @Post(':appointmentId/status')
    @HttpCode(HttpStatus.OK)
    @BusinessAccess()
    @ApiOperation({ summary: 'Muda o status', description: `${TRANSITIONS} Cada mudança fica no histórico.` })
    @ApiDataResponse(AppointmentResponseDto, { description: 'Agendamento com o novo status.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `appointmentId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, OWN_ONLY)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, APPOINTMENT_NOT_FOUND)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Transição não permitida (`INVALID_STATUS_TRANSITION`).')
    async changeStatus(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @CurrentUser('id') userId: string,
        @UuidParam('appointmentId') appointmentId: string,
        @Body() dto: ChangeAppointmentStatusDto,
    ): Promise<ApiResponse<AppointmentResponseDto>> {
        return ApiResponse.of(AppointmentResponseDto.from(await this.appointments.changeStatus(businessId, actor, userId, appointmentId, dto)));
    }
}

@ApiTags('appointments')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/customers/:customerId/appointments`)
export class CustomerAppointmentsController {

    constructor(private readonly appointments: AppointmentsService) { }

    @Get()
    @BusinessAccess()
    @ApiOperation({
        summary: 'Histórico de agendamentos do cliente',
        description: 'Todos os agendamentos do cliente no negócio, do mais recente ao mais antigo, paginados. Inclui cancelados e faltas. Qualquer membro vê o histórico completo, inclusive `professional`.',
    })
    @ApiParam({ name: 'customerId', format: 'uuid' })
    @ApiPaginatedResponse(AppointmentResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida ou `customerId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Cliente não encontrado no negócio (`CUSTOMER_NOT_FOUND`).')
    async list(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('customerId') customerId: string,
        @Query() query: CustomerAppointmentListQueryDto,
    ): Promise<ApiResponse<AppointmentResponseDto[]>> {
        const [appointments, total] = await this.appointments.listForCustomerRecord(businessId, customerId, query);
        return ApiResponse.paginated(appointments.map((a) => AppointmentResponseDto.from(a)), total, query);
    }

    @Get('summary')
    @BusinessAccess()
    @ApiOperation({
        summary: 'Resumo dos agendamentos do cliente',
        description: 'Contagens por status, valor gasto (soma dos `completed`), ticket médio, última visita e próximo agendamento. Qualquer membro pode ver.',
    })
    @ApiParam({ name: 'customerId', format: 'uuid' })
    @ApiDataResponse(CustomerAppointmentSummaryDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`customerId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Cliente não encontrado no negócio (`CUSTOMER_NOT_FOUND`).')
    async summary(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @UuidParam('customerId') customerId: string,
    ): Promise<ApiResponse<CustomerAppointmentSummaryDto>> {
        return ApiResponse.of(CustomerAppointmentSummaryDto.from(await this.appointments.summarizeForCustomerRecord(businessId, customerId)));
    }
}

@ApiTags('me')
@ApiCookieAuth()
@Controller('/api/me/appointments')
export class MyAppointmentsController {

    constructor(private readonly appointments: AppointmentsService) { }

    @Get()
    @ApiOperation({ summary: 'Meus agendamentos', description: 'Agendamentos do usuário em todos os negócios.' })
    @ApiPaginatedResponse(MyAppointmentResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    async list(@CurrentUser('id') userId: string, @Query() query: MyAppointmentListQueryDto): Promise<ApiResponse<MyAppointmentResponseDto[]>> {
        const [appointments, total] = await this.appointments.listForCustomer(userId, query);
        return ApiResponse.paginated(appointments.map((a) => MyAppointmentResponseDto.from(a, AppointmentsService.deadlinesOf(a))), total, query);
    }

    @Post()
    @ApiOperation({
        summary: 'Agenda um horário',
        description: '`startAt` precisa ser um dos horários da disponibilidade pública. Nasce `confirmed` ou `pending`, conforme `autoConfirmOnlineBookings` do negócio. '
            + 'Usa o cadastro de cliente que o negócio já tiver com o e-mail verificado do usuário, ou cria um.',
    })
    @ApiDataResponse(MyAppointmentResponseDto, { status: HttpStatus.CREATED, description: 'Agendamento criado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos, ou nenhum ou ambos entre `serviceIds` e `packageId` (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    @ApiErrorResponse(HttpStatus.FORBIDDEN, 'E-mail da conta não verificado (`EMAIL_NOT_VERIFIED`) ou cliente bloqueado pelo negócio (`CUSTOMER_BLOCKED`; '
        + '`details` traz `until` com o fim do bloqueio temporário ou `feeAmount` com a taxa para desbloquear).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Negócio (`BUSINESS_NOT_FOUND`), serviço ativo (`SERVICE_NOT_FOUND`), pacote agendável (`PACKAGE_NOT_FOUND`) ou profissional apto (`PROFESSIONAL_NOT_FOUND`) não encontrado.')
    @ApiErrorResponse(HttpStatus.PAYMENT_REQUIRED, `O negócio não está aceitando agendamentos online. ${SUBSCRIPTION_RESTRICTED_DOC}`)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Horário fora da disponibilidade ou ocupado nesse meio-tempo (`APPOINTMENT_SLOT_UNAVAILABLE`).')
    async create(@CurrentUser('id') userId: string, @Body() dto: CreateMyAppointmentDto): Promise<ApiResponse<MyAppointmentResponseDto>> {
        const appointment = await this.appointments.createByCustomer(userId, dto);
        return ApiResponse.of(MyAppointmentResponseDto.from(appointment, AppointmentsService.deadlinesOf(appointment)));
    }

    @Post(':appointmentId/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancela meu agendamento', description: 'Só `pending`/`confirmed` e até `cancellationLimitHours` antes do início.' })
    @ApiDataResponse(MyAppointmentResponseDto, { description: 'Agendamento cancelado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos ou `appointmentId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, 'Agendamento não encontrado entre os do usuário (`APPOINTMENT_NOT_FOUND`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, 'Já encerrado (`INVALID_STATUS_TRANSITION`) ou fora do prazo de cancelamento (`CANCELLATION_WINDOW_CLOSED`).')
    async cancel(
        @CurrentUser('id') userId: string,
        @UuidParam('appointmentId') appointmentId: string,
        @Body() dto: CancelMyAppointmentDto,
    ): Promise<ApiResponse<MyAppointmentResponseDto>> {
        const appointment = await this.appointments.cancelByCustomer(userId, appointmentId, dto.reason);
        return ApiResponse.of(MyAppointmentResponseDto.from(appointment, AppointmentsService.deadlinesOf(appointment)));
    }
}
