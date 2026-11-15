import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { BUSINESS_ID_PARAM, BusinessAccess, CurrentMembership, type BusinessMembership } from '../businesses/index.js';
import { DashboardCacheService } from './dashboard-cache.service.js';
import { DashboardService } from './dashboard.service.js';
import {
    DashboardHeatmapResponseDto,
    DashboardInactiveCustomersResponseDto,
    DashboardOccupancyResponseDto,
    DashboardPaymentMethodsResponseDto,
    DashboardProfessionalsResponseDto,
    DashboardRangeQueryDto,
    DashboardScopeQueryDto,
    DashboardServicesResponseDto,
    DashboardSummaryQueryDto,
    DashboardSummaryResponseDto,
    DashboardTimeseriesQueryDto,
    DashboardTimeseriesResponseDto,
} from './dto/dashboard.dto.js';

const SCOPE = 'Gestores (`owner`/`admin`) veem o negócio inteiro ou um profissional (`professionalId`). Quem é só `professional` vê sempre os próprios números. '
    + 'As definições dos indicadores estão em "Indicadores" nas regras de negócio.';
const NOT_PROFESSIONAL = 'Membro sem papel de gestão e sem perfil de profissional (`INSUFFICIENT_BUSINESS_ROLE`).';
const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const INVALID_RANGE = 'Query inválida, `to` antes de `from` ou período maior que 366 dias (`VALIDATION_ERROR`).';
const PROFESSIONAL_NOT_FOUND = '`professionalId` não é profissional do negócio (`PROFESSIONAL_NOT_FOUND`).';

@ApiTags('dashboard')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/dashboard`)
export class DashboardController {

    constructor(
        private readonly dashboard: DashboardService,
        private readonly cache: DashboardCacheService,
    ) { }

    @Get('summary')
    @BusinessAccess()
    @ApiOperation({ summary: 'Indicadores do período', description: `Valores do período e do período de comparação, para os cartões do dashboard. ${SCOPE}` })
    @ApiDataResponse(DashboardSummaryResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida, `to` antes de `from`, período maior que 366 dias ou só um entre `compareFrom` e `compareTo` (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, NOT_PROFESSIONAL)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async summary(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @Query() query: DashboardSummaryQueryDto,
    ): Promise<ApiResponse<DashboardSummaryResponseDto>> {
        return ApiResponse.of(await this.cache.wrap(businessId, actor, 'summary', query, () => this.dashboard.summary(businessId, actor, query)));
    }

    @Get('timeseries')
    @BusinessAccess()
    @ApiOperation({ summary: 'Indicadores ao longo do período', description: `Agendamentos por status, faturamento, recebido, comissão, clientes novos e nota, agrupados por dia, semana ou mês. ${SCOPE}` })
    @ApiDataResponse(DashboardTimeseriesResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_RANGE)
    @ApiErrorResponse(HttpStatus.FORBIDDEN, NOT_PROFESSIONAL)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async timeseries(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @Query() query: DashboardTimeseriesQueryDto,
    ): Promise<ApiResponse<DashboardTimeseriesResponseDto>> {
        return ApiResponse.of(await this.cache.wrap(businessId, actor, 'timeseries', query, () => this.dashboard.timeseries(businessId, actor, query)));
    }

    @Get('heatmap')
    @BusinessAccess()
    @ApiOperation({ summary: 'Horários de pico', description: `Atendimentos do período por dia da semana e hora de início, no fuso do negócio. ${SCOPE}` })
    @ApiDataResponse(DashboardHeatmapResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_RANGE)
    @ApiErrorResponse(HttpStatus.FORBIDDEN, NOT_PROFESSIONAL)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async heatmap(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @Query() query: DashboardRangeQueryDto,
    ): Promise<ApiResponse<DashboardHeatmapResponseDto>> {
        return ApiResponse.of(await this.cache.wrap(businessId, actor, 'heatmap', query, () => this.dashboard.heatmap(businessId, actor, query)));
    }

    @Get('occupancy')
    @BusinessAccess()
    @ApiOperation({
        summary: 'Ocupação da agenda',
        description: `Minutos agendados (\`completed\`, \`confirmed\`, \`in_progress\`) ÷ minutos de expediente, descontadas as ausências, no período e no de comparação, no total e por profissional ativo. ${SCOPE}`,
    })
    @ApiDataResponse(DashboardOccupancyResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Query inválida, `to` antes de `from`, período maior que 366 dias ou só um entre `compareFrom` e `compareTo` (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.FORBIDDEN, NOT_PROFESSIONAL)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async occupancy(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @Query() query: DashboardSummaryQueryDto,
    ): Promise<ApiResponse<DashboardOccupancyResponseDto>> {
        return ApiResponse.of(await this.cache.wrap(businessId, actor, 'occupancy', query, () => this.dashboard.occupancy(businessId, actor, query)));
    }

    @Get('professionals')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Indicadores por profissional', description: 'Atendimentos, faltas, faturamento, ticket médio, nota e comissão de cada profissional no período, para o ranking da equipe.' })
    @ApiDataResponse(DashboardProfessionalsResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_RANGE)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async professionals(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @Query() query: DashboardRangeQueryDto,
    ): Promise<ApiResponse<DashboardProfessionalsResponseDto>> {
        return ApiResponse.of(await this.cache.wrap(businessId, actor, 'professionals', query, () => this.dashboard.professionalsBreakdown(businessId, actor, query)));
    }

    @Get('services')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Serviços e pacotes mais vendidos', description: 'Quantidade e faturamento de cada serviço avulso e de cada pacote nos atendimentos do período.' })
    @ApiDataResponse(DashboardServicesResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_RANGE)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async services(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @Query() query: DashboardRangeQueryDto,
    ): Promise<ApiResponse<DashboardServicesResponseDto>> {
        return ApiResponse.of(await this.cache.wrap(businessId, actor, 'services', query, () => this.dashboard.servicesBreakdown(businessId, actor, query)));
    }

    @Get('payment-methods')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Recebido por forma de pagamento', description: 'Soma dos pagamentos `paid` com `paidAt` no período, por forma de pagamento.' })
    @ApiDataResponse(DashboardPaymentMethodsResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_RANGE)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async paymentMethods(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @Query() query: DashboardRangeQueryDto,
    ): Promise<ApiResponse<DashboardPaymentMethodsResponseDto>> {
        return ApiResponse.of(await this.cache.wrap(businessId, actor, 'payment-methods', query, () => this.dashboard.paymentMethodsBreakdown(businessId, actor, query)));
    }

    @Get('inactive-customers')
    @BusinessAccess(...MANAGERS)
    @ApiOperation({
        summary: 'Clientes que sumiram',
        description: 'Clientes com pelo menos dois atendimentos, sem atendimento há mais de 60 dias e sem agendamento futuro. Não depende do período; com `professionalId`, considera só os atendimentos com ele.',
    })
    @ApiDataResponse(DashboardInactiveCustomersResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`professionalId` não é UUID (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, PROFESSIONAL_NOT_FOUND)
    async inactiveCustomers(
        @Param(BUSINESS_ID_PARAM) businessId: string,
        @CurrentMembership() actor: BusinessMembership,
        @Query() query: DashboardScopeQueryDto,
    ): Promise<ApiResponse<DashboardInactiveCustomersResponseDto>> {
        return ApiResponse.of(await this.cache.wrap(businessId, actor, 'inactive-customers', query, () => this.dashboard.inactiveCustomers(businessId, actor, query)));
    }
}
