import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { LOCAL_DATE_PATTERN } from '../../../common/utilities/time-zone.js';

export const DASHBOARD_INTERVALS = ['day', 'week', 'month'] as const;

export type DashboardInterval = (typeof DASHBOARD_INTERVALS)[number];

export const DASHBOARD_SCOPES = ['business', 'professional'] as const;

export type DashboardScope = (typeof DASHBOARD_SCOPES)[number];

export const DASHBOARD_ITEM_TYPES = ['service', 'package'] as const;

export type DashboardItemType = (typeof DASHBOARD_ITEM_TYPES)[number];

export class DashboardScopeQueryDto {
    @ApiPropertyOptional({ format: 'uuid', description: 'Só os números deste profissional. Ignorado para quem é só `professional`, que sempre vê os próprios.' })
    @IsOptional()
    @IsUUID()
    professionalId?: string;
}

export class DashboardRangeQueryDto extends DashboardScopeQueryDto {
    @ApiProperty({ description: 'Primeiro dia do período (`YYYY-MM-DD`), no fuso do negócio.', pattern: LOCAL_DATE_PATTERN.source, example: '2026-09-24' })
    @Matches(LOCAL_DATE_PATTERN)
    from: string;

    @ApiProperty({ description: 'Último dia do período (`YYYY-MM-DD`), inclusive; até 366 dias depois de `from`.', pattern: LOCAL_DATE_PATTERN.source, example: '2026-10-23' })
    @Matches(LOCAL_DATE_PATTERN)
    to: string;
}

export class DashboardSummaryQueryDto extends DashboardRangeQueryDto {
    @ApiPropertyOptional({ description: 'Primeiro dia do período de comparação. Sem ele, compara com os dias imediatamente anteriores, de mesma duração. Envie junto com `compareTo`.', pattern: LOCAL_DATE_PATTERN.source, example: '2026-08-25' })
    @IsOptional()
    @Matches(LOCAL_DATE_PATTERN)
    compareFrom?: string;

    @ApiPropertyOptional({ description: 'Último dia do período de comparação, inclusive.', pattern: LOCAL_DATE_PATTERN.source, example: '2026-09-23' })
    @IsOptional()
    @Matches(LOCAL_DATE_PATTERN)
    compareTo?: string;
}

export class DashboardTimeseriesQueryDto extends DashboardRangeQueryDto {
    @ApiPropertyOptional({ enum: DASHBOARD_INTERVALS, description: 'Agrupamento. Sem ele: `day` até 62 dias, `week` até 200 e `month` acima disso. Semanas começam na segunda.' })
    @IsOptional()
    @IsIn(DASHBOARD_INTERVALS)
    interval?: DashboardInterval;
}

export class DashboardPeriodDto {
    @ApiProperty({ example: '2026-09-24' })
    from: string;

    @ApiProperty({ example: '2026-10-23' })
    to: string;
}

export class DashboardMetricsDto {
    @ApiProperty({ description: 'Agendamentos com início no período, de qualquer status.', example: 132 })
    appointments: number;

    @ApiProperty({ description: 'Agendamentos `cancelled` com início no período.', example: 9 })
    cancelled: number;

    @ApiProperty({ description: 'Atendimentos: agendamentos `completed` com início no período.', example: 104 })
    completed: number;

    @ApiProperty({ description: 'Agendamentos `no_show` com início no período.', example: 6 })
    noShows: number;

    @ApiProperty({ description: 'Faturamento: soma do `totalPrice` dos atendimentos.', example: 7820.5 })
    revenue: number;

    @ApiProperty({ description: 'Soma dos pagamentos `paid` com `paidAt` no período.', example: 7310 })
    received: number;

    @ApiProperty({ description: 'Saldo dos atendimentos não quitados com início até o fim do período.', example: 510.5 })
    receivable: number;

    @ApiProperty({ type: Number, nullable: true, description: 'Faturamento ÷ atendimentos; `null` sem atendimentos.', example: 75.2 })
    averageTicket: number | null;

    @ApiProperty({ type: Number, nullable: true, description: '`noShows` ÷ (`completed` + `noShows`), de 0 a 1; `null` sem nenhum dos dois.', example: 0.0545 })
    noShowRate: number | null;

    @ApiProperty({ type: Number, nullable: true, description: '`cancelled` ÷ `appointments`, de 0 a 1; `null` sem agendamentos.', example: 0.0682 })
    cancellationRate: number | null;

    @ApiProperty({ description: 'Clientes distintos com atendimento no período.', example: 71 })
    customersServed: number;

    @ApiProperty({ description: 'Clientes atendidos cujo primeiro atendimento caiu no período.', example: 18 })
    newCustomers: number;

    @ApiProperty({ description: 'Clientes atendidos que já tinham atendimento antes do período.', example: 53 })
    returningCustomers: number;

    @ApiProperty({ type: Number, nullable: true, description: 'Média das avaliações criadas no período, inclusive as de comentário oculto; `null` sem avaliações.', example: 4.7 })
    averageRating: number | null;

    @ApiProperty({ description: 'Quantidade de avaliações criadas no período.', example: 32 })
    ratingCount: number;

    @ApiProperty({ type: Number, nullable: true, description: 'Agendamentos com `origin = customer` ÷ agendamentos com origem conhecida, de 0 a 1; `null` sem origem conhecida.', example: 0.31 })
    onlineShare: number | null;

    @ApiProperty({ description: 'Comissão dos atendimentos.', example: 2737.18 })
    commission: number;
}

export class DashboardSummaryResponseDto {
    @ApiProperty({ enum: DASHBOARD_SCOPES, description: '`business`: o negócio inteiro (ou o profissional filtrado, para gestores). `professional`: só os números de quem pediu.' })
    scope: DashboardScope;

    @ApiProperty({ type: String, format: 'uuid', nullable: true, description: 'Profissional dos números; `null` no negócio inteiro.' })
    professionalId: string | null;

    @ApiProperty({ description: 'Se já existe algum atendimento no recorte, em qualquer data. Sem nenhum, mostre a orientação de primeiros passos em vez dos gráficos.' })
    hasCompletedAppointments: boolean;

    @ApiProperty({ type: DashboardPeriodDto })
    period: DashboardPeriodDto;

    @ApiProperty({ type: DashboardPeriodDto })
    comparison: DashboardPeriodDto;

    @ApiProperty({ type: DashboardMetricsDto })
    current: DashboardMetricsDto;

    @ApiProperty({ type: DashboardMetricsDto, description: 'Os mesmos indicadores no período de comparação.' })
    previous: DashboardMetricsDto;
}

export class DashboardBucketDto {
    @ApiProperty({ description: 'Primeiro dia do grupo (`YYYY-MM-DD`); o primeiro e o último podem cobrir só parte da semana ou do mês.', example: '2026-10-19' })
    start: string;

    @ApiProperty({ example: 21 })
    appointments: number;

    @ApiProperty({ example: 17 })
    completed: number;

    @ApiProperty({ example: 2 })
    cancelled: number;

    @ApiProperty({ example: 1 })
    noShows: number;

    @ApiProperty({ example: 1290 })
    revenue: number;

    @ApiProperty({ example: 1180 })
    received: number;

    @ApiProperty({ example: 451.5 })
    commission: number;

    @ApiProperty({ example: 3 })
    newCustomers: number;

    @ApiProperty({ type: Number, nullable: true, example: 4.8 })
    averageRating: number | null;

    @ApiProperty({ example: 5 })
    ratingCount: number;
}

export class DashboardTimeseriesResponseDto {
    @ApiProperty({ enum: DASHBOARD_SCOPES })
    scope: DashboardScope;

    @ApiProperty({ type: String, format: 'uuid', nullable: true })
    professionalId: string | null;

    @ApiProperty({ enum: DASHBOARD_INTERVALS })
    interval: DashboardInterval;

    @ApiProperty({ type: DashboardPeriodDto })
    period: DashboardPeriodDto;

    @ApiProperty({ type: [DashboardBucketDto], description: 'Um item por grupo, do mais antigo ao mais novo, inclusive os vazios.' })
    buckets: DashboardBucketDto[];
}

export class DashboardProfessionalItemDto {
    @ApiProperty({ format: 'uuid' })
    professionalId: string;

    @ApiProperty({ description: 'Nome de exibição do profissional.', example: 'Ana' })
    name: string;

    @ApiProperty({ description: 'Atendimentos no período.', example: 42 })
    completed: number;

    @ApiProperty({ description: 'Faltas no período.', example: 3 })
    noShows: number;

    @ApiProperty({ description: 'Faturamento dos atendimentos dele.', example: 3150 })
    revenue: number;

    @ApiProperty({ type: Number, nullable: true, example: 75 })
    averageTicket: number | null;

    @ApiProperty({ type: Number, nullable: true, description: 'De 0 a 1.', example: 0.0667 })
    noShowRate: number | null;

    @ApiProperty({ type: Number, nullable: true, example: 4.8 })
    averageRating: number | null;

    @ApiProperty({ example: 12 })
    ratingCount: number;

    @ApiProperty({ example: 1102.5 })
    commission: number;
}

export class DashboardProfessionalsResponseDto {
    @ApiProperty({ type: DashboardPeriodDto })
    period: DashboardPeriodDto;

    @ApiProperty({ type: [DashboardProfessionalItemDto], description: 'Profissionais com atendimento ou falta no período, do maior faturamento ao menor.' })
    items: DashboardProfessionalItemDto[];
}

export class DashboardServiceItemDto {
    @ApiProperty({ enum: DASHBOARD_ITEM_TYPES, description: '`service`: serviço avulso. `package`: pacote, contado uma vez por atendimento.' })
    type: DashboardItemType;

    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Corte masculino' })
    name: string;

    @ApiProperty({ description: 'Vezes em que foi atendido no período.', example: 38 })
    quantity: number;

    @ApiProperty({ description: 'Faturamento: preço cobrado nas linhas avulsas ou preço do pacote.', example: 1710 })
    revenue: number;
}

export class DashboardServicesResponseDto {
    @ApiProperty({ type: DashboardPeriodDto })
    period: DashboardPeriodDto;

    @ApiProperty({ type: [DashboardServiceItemDto], description: 'Serviços e pacotes atendidos no período, do maior faturamento ao menor.' })
    items: DashboardServiceItemDto[];
}

export class DashboardPaymentMethodItemDto {
    @ApiProperty({ format: 'uuid' })
    paymentMethodId: string;

    @ApiProperty({ example: 'Pix' })
    name: string;

    @ApiProperty({ description: 'Soma dos pagamentos `paid` com `paidAt` no período.', example: 2480 })
    received: number;

    @ApiProperty({ description: 'Quantidade desses pagamentos.', example: 31 })
    payments: number;
}

export class DashboardPaymentMethodsResponseDto {
    @ApiProperty({ type: DashboardPeriodDto })
    period: DashboardPeriodDto;

    @ApiProperty({ type: [DashboardPaymentMethodItemDto], description: 'Formas com recebimento no período, da maior para a menor.' })
    items: DashboardPaymentMethodItemDto[];
}

export class DashboardInactiveCustomerDto {
    @ApiProperty({ format: 'uuid' })
    customerId: string;

    @ApiProperty({ example: 'Maria Souza' })
    name: string;

    @ApiProperty({ type: String, nullable: true, description: 'Telefone em E.164.', example: '+5511987654321' })
    phone: string | null;

    @ApiProperty({ format: 'date-time', description: 'Início do último atendimento.' })
    lastCompletedAt: Date;

    @ApiProperty({ description: 'Atendimentos que o cliente já teve.', example: 6 })
    completedCount: number;
}

export class DashboardInactiveCustomersResponseDto {
    @ApiProperty({ description: 'Dias sem atendimento a partir dos quais o cliente conta como sumido.', example: 60 })
    inactiveAfterDays: number;

    @ApiProperty({ description: 'Quantos clientes sumiram, além dos listados.', example: 14 })
    total: number;

    @ApiProperty({ type: [DashboardInactiveCustomerDto], description: 'Os 10 que sumiram mais recentemente, do mais recente ao mais antigo.' })
    items: DashboardInactiveCustomerDto[];
}

export class DashboardHeatmapCellDto {
    @ApiProperty({ description: 'Dia da semana do início, no fuso do negócio (domingo = 0).', minimum: 0, maximum: 6, example: 5 })
    weekday: number;

    @ApiProperty({ description: 'Hora do início, no fuso do negócio.', minimum: 0, maximum: 23, example: 10 })
    hour: number;

    @ApiProperty({ description: 'Atendimentos que começaram nesse dia da semana e hora, somados no período.', example: 14 })
    appointments: number;
}

export class DashboardHeatmapResponseDto {
    @ApiProperty({ enum: DASHBOARD_SCOPES })
    scope: DashboardScope;

    @ApiProperty({ type: String, format: 'uuid', nullable: true })
    professionalId: string | null;

    @ApiProperty({ type: DashboardPeriodDto })
    period: DashboardPeriodDto;

    @ApiProperty({ type: [DashboardHeatmapCellDto], description: 'Só as combinações com atendimento; as ausentes valem zero.' })
    cells: DashboardHeatmapCellDto[];
}

export class DashboardOccupancyDto {
    @ApiProperty({ description: 'Minutos de agendamentos `completed`, `confirmed` e `in_progress` dentro do período.', example: 5400 })
    bookedMinutes: number;

    @ApiProperty({ description: 'Minutos de expediente no período, descontadas as ausências.', example: 9600 })
    availableMinutes: number;

    @ApiProperty({ type: Number, nullable: true, description: '`bookedMinutes` ÷ `availableMinutes`; `null` sem expediente. Pode passar de 1 com encaixes fora do expediente.', example: 0.5625 })
    rate: number | null;
}

export class DashboardProfessionalOccupancyDto extends DashboardOccupancyDto {
    @ApiProperty({ format: 'uuid' })
    professionalId: string;

    @ApiProperty({ example: 'Ana' })
    name: string;
}

export class DashboardOccupancyResponseDto {
    @ApiProperty({ enum: DASHBOARD_SCOPES })
    scope: DashboardScope;

    @ApiProperty({ type: String, format: 'uuid', nullable: true })
    professionalId: string | null;

    @ApiProperty({ type: DashboardPeriodDto })
    period: DashboardPeriodDto;

    @ApiProperty({ type: DashboardPeriodDto })
    comparison: DashboardPeriodDto;

    @ApiProperty({ type: DashboardOccupancyDto })
    current: DashboardOccupancyDto;

    @ApiProperty({ type: DashboardOccupancyDto })
    previous: DashboardOccupancyDto;

    @ApiProperty({ type: [DashboardProfessionalOccupancyDto], description: 'Profissionais ativos com expediente ou agendamento no período, da maior ocupação para a menor.' })
    professionals: DashboardProfessionalOccupancyDto[];
}
