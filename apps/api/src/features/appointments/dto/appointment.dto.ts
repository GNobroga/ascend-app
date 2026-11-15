import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsDate,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { AppointmentOrigin } from '../../../common/enums/appointment-origin.enum.js';
import { AppointmentStatus } from '../../../common/enums/appointment-status.enum.js';
import { AppointmentPaymentStatus } from '../../../common/enums/appointment-payment-status.enum.js';
import { CommissionMode } from '../../../common/enums/commission-mode.enum.js';
import { PaymentStatus } from '../../../common/enums/payment-status.enum.js';
import { ReviewStatus } from '../../../common/enums/review-status.enum.js';
import { BooleanQuery } from '../../../common/http/boolean-query.js';
import { PaginationQueryDto } from '../../../common/http/pagination-query.dto.js';
import { storageUrl } from '../../../common/storage/storage-url.js';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { AppointmentServiceEntity } from '../../../database/entities/appointment-service.entity.js';
import type { AppointmentStatusHistoryEntity } from '../../../database/entities/appointment-status-history.entity.js';
import type { AppointmentEntity } from '../../../database/entities/appointment.entity.js';

const STATUSES = Object.values(AppointmentStatus);
const MAX_SERVICES = 10;
const NOTES_MAX_LENGTH = 1000;

class BookingFieldsDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    professionalId: string;

    @ApiPropertyOptional({
        type: [String],
        format: 'uuid',
        description: `Serviços avulsos (1 a ${MAX_SERVICES}), atendidos em sequência na ordem enviada. Envie \`serviceIds\` ou \`packageId\`, não os dois.`,
        minItems: 1,
        maxItems: MAX_SERVICES,
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(MAX_SERVICES)
    @ArrayUnique()
    @IsUUID('all', { each: true })
    serviceIds?: string[];

    @ApiPropertyOptional({ format: 'uuid', description: 'Pacote: preço do pacote rateado entre os serviços dele. Envie `serviceIds` ou `packageId`, não os dois.' })
    @IsOptional()
    @IsUUID()
    packageId?: string;

    @ApiProperty({ format: 'date-time', description: 'Início; o fim é calculado pela soma das durações.', example: '2026-10-27T13:00:00.000Z' })
    @Type(() => Date)
    @IsDate()
    startAt: Date;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: NOTES_MAX_LENGTH, description: 'Observações do cliente.', example: 'Prefiro máquina 2 nas laterais.' })
    @IsOptional()
    @IsString()
    @MaxLength(NOTES_MAX_LENGTH)
    customerNotes?: string | null;
}

export class CreateAppointmentDto extends BookingFieldsDto {
    @ApiProperty({ format: 'uuid' })
    @IsUUID()
    customerId: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: NOTES_MAX_LENGTH, description: 'Observações internas; o cliente não vê.' })
    @IsOptional()
    @IsString()
    @MaxLength(NOTES_MAX_LENGTH)
    internalNotes?: string | null;
}

export class UpdateAppointmentServicesDto {
    @ApiProperty({
        type: [String],
        format: 'uuid',
        description: `Lista final de serviços (1 a ${MAX_SERVICES}). Os que já estavam mantêm preço e comissão da reserva; os novos usam os valores atuais do catálogo.`,
        minItems: 1,
        maxItems: MAX_SERVICES,
    })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(MAX_SERVICES)
    @ArrayUnique()
    @IsUUID('all', { each: true })
    serviceIds: string[];
}

export class CreateMyAppointmentDto extends BookingFieldsDto {
    @ApiProperty({ description: 'Slug do negócio.', example: 'barbearia-do-joao' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    businessSlug: string;
}

export class RescheduleAppointmentDto {
    @ApiPropertyOptional({ format: 'date-time', description: 'Novo início; a duração continua a da reserva.' })
    @IsOptionalNotNull()
    @Type(() => Date)
    @IsDate()
    startAt?: Date;

    @ApiPropertyOptional({ format: 'uuid', description: 'Novo profissional; precisa executar os serviços. A comissão é recalculada.' })
    @IsOptionalNotNull()
    @IsUUID()
    professionalId?: string;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: NOTES_MAX_LENGTH, description: '`null` remove as observações internas.' })
    @IsOptional()
    @IsString()
    @MaxLength(NOTES_MAX_LENGTH)
    internalNotes?: string | null;
}

export class ChangeAppointmentStatusDto {
    @ApiProperty({ enum: STATUSES, description: 'Novo status; veja as transições permitidas na descrição da rota.' })
    @IsIn(STATUSES)
    status: AppointmentStatus;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: NOTES_MAX_LENGTH, description: 'Motivo; em `cancelled` vira o motivo do cancelamento, que o cliente vê e recebe no aviso.' })
    @IsOptional()
    @IsString()
    @MaxLength(NOTES_MAX_LENGTH)
    reason?: string | null;
}

export class CancelMyAppointmentDto {
    @ApiPropertyOptional({ type: String, nullable: true, maxLength: NOTES_MAX_LENGTH, example: 'Surgiu um imprevisto.' })
    @IsOptional()
    @IsString()
    @MaxLength(NOTES_MAX_LENGTH)
    reason?: string | null;
}

export class AppointmentListQueryDto {
    @ApiProperty({ format: 'date-time', description: 'Início do intervalo (agendamentos que terminam depois dele).' })
    @Type(() => Date)
    @IsDate()
    from: Date;

    @ApiProperty({ format: 'date-time', description: 'Fim do intervalo, até 31 dias depois de `from`.' })
    @Type(() => Date)
    @IsDate()
    to: Date;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    professionalId?: string;

    @ApiPropertyOptional({ enum: STATUSES })
    @IsOptional()
    @IsIn(STATUSES)
    status?: AppointmentStatus;
}

export class CustomerAppointmentListQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: STATUSES, description: 'Só os agendamentos com este status.' })
    @IsOptional()
    @IsIn(STATUSES)
    status?: AppointmentStatus;
}

export interface CustomerAppointmentSummary {
    totalCount: number;
    completedCount: number;
    cancelledCount: number;
    noShowCount: number;
    totalSpent: number;
    lastVisitAt: Date | null;
    nextAppointmentAt: Date | null;
}

export class CustomerAppointmentSummaryDto {
    @ApiProperty({ description: 'Agendamentos em qualquer status.', example: 24 })
    totalCount: number;

    @ApiProperty({ example: 20 })
    completedCount: number;

    @ApiProperty({ example: 2 })
    cancelledCount: number;

    @ApiProperty({ example: 2 })
    noShowCount: number;

    @ApiProperty({ description: 'Soma de `totalPrice` dos agendamentos `completed`.', example: 1920 })
    totalSpent: number;

    @ApiProperty({ type: Number, nullable: true, description: '`totalSpent` dividido por `completedCount`; `null` sem atendimento concluído.', example: 96 })
    averageTicket: number | null;

    @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'Início do último agendamento `completed`.' })
    lastVisitAt: Date | null;

    @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'Início do próximo agendamento `pending` ou `confirmed` que ainda não começou.' })
    nextAppointmentAt: Date | null;

    static from(summary: CustomerAppointmentSummary): CustomerAppointmentSummaryDto {
        const dto = new CustomerAppointmentSummaryDto();
        dto.totalCount = summary.totalCount;
        dto.completedCount = summary.completedCount;
        dto.cancelledCount = summary.cancelledCount;
        dto.noShowCount = summary.noShowCount;
        dto.totalSpent = summary.totalSpent;
        dto.averageTicket = summary.completedCount > 0 ? Math.round(summary.totalSpent / summary.completedCount * 100) / 100 : null;
        dto.lastVisitAt = summary.lastVisitAt;
        dto.nextAppointmentAt = summary.nextAppointmentAt;
        return dto;
    }
}

export class MyAppointmentListQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ type: Boolean, description: '`true`: próximos, do mais cedo ao mais tarde. `false`: passados, do mais recente. Omitido: todos, do mais recente.' })
    @IsOptional()
    @BooleanQuery()
    @IsBoolean()
    upcoming?: boolean;
}

export class AppointmentLineDto {
    @ApiProperty({ format: 'uuid' })
    serviceId: string;

    @ApiProperty({ example: 'Corte masculino' })
    name: string;

    @ApiProperty({ description: 'Preço de tabela na reserva.', example: 50 })
    listPrice: number;

    @ApiProperty({ description: 'Preço cobrado; num pacote, a parte do preço do pacote rateada por esta linha.', example: 50 })
    price: number;

    @ApiProperty({ example: 45 })
    durationMinutes: number;

    @ApiProperty({ example: 40 })
    commissionPercent: number;

    @ApiProperty({ example: 20 })
    commissionAmount: number;

    static from(line: AppointmentServiceEntity): AppointmentLineDto {
        const dto = new AppointmentLineDto();
        dto.serviceId = line.service.id;
        dto.name = line.service.name;
        dto.listPrice = line.listPrice;
        dto.price = line.price;
        dto.durationMinutes = line.durationMinutes;
        dto.commissionPercent = line.commissionPercent;
        dto.commissionAmount = line.commissionAmount;
        return dto;
    }
}

export class AppointmentStatusChangeDto {
    @ApiProperty({ type: String, enum: STATUSES, nullable: true, description: '`null` na criação.' })
    previousStatus: AppointmentStatus | null;

    @ApiProperty({ enum: STATUSES })
    newStatus: AppointmentStatus;

    @ApiProperty({ type: String, nullable: true })
    reason: string | null;

    @ApiProperty({ type: String, nullable: true, description: 'Quem mudou; `null` quando foi o sistema.', example: 'João Silva' })
    changedByName: string | null;

    @ApiProperty({ format: 'date-time' })
    changedAt: Date;

    static from(change: AppointmentStatusHistoryEntity): AppointmentStatusChangeDto {
        const dto = new AppointmentStatusChangeDto();
        dto.previousStatus = change.previousStatus;
        dto.newStatus = change.newStatus;
        dto.reason = change.reason;
        dto.changedByName = change.changedByUser?.name ?? null;
        dto.changedAt = change.createdAt;
        return dto;
    }
}

export class AppointmentReviewDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
    rating: number;

    @ApiProperty({ enum: Object.values(ReviewStatus) })
    status: ReviewStatus;
}

export class AppointmentPartyDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Maria Souza' })
    name: string;
}

export class AppointmentResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ enum: STATUSES })
    status: AppointmentStatus;

    @ApiProperty({
        enum: Object.values(AppointmentOrigin),
        nullable: true,
        description: '`customer`: o cliente agendou pela página pública. `team`: a equipe agendou pelo painel. `null` em agendamentos antigos sem origem inferida.',
        example: AppointmentOrigin.CUSTOMER,
    })
    origin: AppointmentOrigin | null;

    @ApiProperty({ format: 'date-time' })
    startAt: Date;

    @ApiProperty({ format: 'date-time' })
    endAt: Date;

    @ApiProperty({ description: 'Soma dos preços cobrados; num pacote, o preço do pacote.', example: 80 })
    totalPrice: number;

    @ApiProperty({ type: AppointmentPartyDto, nullable: true, description: 'Pacote reservado; `null` em serviços avulsos.' })
    package: AppointmentPartyDto | null;

    @ApiProperty({ enum: Object.values(CommissionMode), nullable: true, description: 'Modo de comissão do pacote; `null` em serviços avulsos.' })
    commissionMode: CommissionMode | null;

    @ApiProperty({ type: Number, nullable: true, description: 'Comissão do pacote em %, só no modo `package`.', example: 35 })
    commissionPercent: number | null;

    @ApiProperty({ description: 'Comissão sobre o pacote (modo `package`); `0` nos demais, em que a comissão fica nas linhas.', example: 26.25 })
    commissionAmount: number;

    @ApiProperty({ description: 'Comissão total: a do agendamento mais a das linhas.', example: 26.25 })
    totalCommission: number;

    @ApiProperty({ description: 'Soma dos pagamentos `paid`.', example: 40 })
    paidAmount: number;

    @ApiProperty({ description: '`totalPrice` menos `paidAmount`.', example: 35 })
    balance: number;

    @ApiProperty({ enum: Object.values(AppointmentPaymentStatus), description: '`unpaid`: nada recebido. `partial`: parte recebida. `paid`: recebido o total (total zero já é `paid`).' })
    paymentStatus: AppointmentPaymentStatus;

    @ApiProperty({ type: AppointmentReviewDto, nullable: true, description: 'Avaliação do cliente; `null` se ainda não avaliou.' })
    review: AppointmentReviewDto | null;

    @ApiProperty({ type: AppointmentPartyDto })
    customer: AppointmentPartyDto;

    @ApiProperty({ type: AppointmentPartyDto, description: '`name` é o nome de exibição do profissional.' })
    professional: AppointmentPartyDto;

    @ApiProperty({ type: [AppointmentLineDto] })
    services: AppointmentLineDto[];

    @ApiProperty({ type: String, nullable: true })
    customerNotes: string | null;

    @ApiProperty({ type: String, nullable: true })
    internalNotes: string | null;

    @ApiProperty({ type: String, nullable: true })
    cancellationReason: string | null;

    @ApiProperty({ type: String, format: 'date-time', nullable: true })
    cancelledAt: Date | null;

    @ApiPropertyOptional({ type: [AppointmentStatusChangeDto], description: 'Só no detalhe; do mais antigo ao mais novo.' })
    history?: AppointmentStatusChangeDto[];

    @ApiProperty({ format: 'date-time' })
    createdAt: Date;

    static from(appointment: AppointmentEntity): AppointmentResponseDto {
        const dto = new AppointmentResponseDto();
        dto.id = appointment.id;
        dto.status = appointment.status;
        dto.origin = appointment.origin;
        dto.startAt = appointment.startAt;
        dto.endAt = appointment.endAt;
        dto.totalPrice = appointment.totalPrice;
        dto.package = appointment.package && { id: appointment.package.id, name: appointment.package.name };
        dto.commissionMode = appointment.commissionMode;
        dto.commissionPercent = appointment.commissionPercent;
        dto.commissionAmount = appointment.commissionAmount;
        dto.totalCommission = Math.round((appointment.commissionAmount + appointment.services.reduce((total, s) => total + s.commissionAmount, 0)) * 100) / 100;
        const paidCents = appointment.payments.filter((p) => p.status === PaymentStatus.PAID).reduce((total, p) => total + Math.round(p.amount * 100), 0);
        const totalCents = Math.round(appointment.totalPrice * 100);
        dto.paidAmount = paidCents / 100;
        dto.balance = (totalCents - paidCents) / 100;
        const [review] = appointment.reviews ?? [];
        dto.review = review ? { id: review.id, rating: review.rating, status: review.status } : null;
        dto.paymentStatus = paidCents >= totalCents
            ? AppointmentPaymentStatus.PAID
            : paidCents > 0 ? AppointmentPaymentStatus.PARTIAL : AppointmentPaymentStatus.UNPAID;
        dto.customer = { id: appointment.customer.id, name: appointment.customer.name };
        dto.professional = { id: appointment.professional.id, name: appointment.professional.displayName };
        dto.services = appointment.services.map((s) => AppointmentLineDto.from(s));
        dto.customerNotes = appointment.customerNotes;
        dto.internalNotes = appointment.internalNotes;
        dto.cancellationReason = appointment.cancellationReason;
        dto.cancelledAt = appointment.cancelledAt;
        dto.history = appointment.statusHistory?.map((h) => AppointmentStatusChangeDto.from(h));
        dto.createdAt = appointment.createdAt;
        return dto;
    }
}

export class MyAppointmentBusinessDto {
    @ApiProperty({ example: 'Barbearia do João' })
    name: string;

    @ApiProperty({ example: 'barbearia-do-joao' })
    slug: string;

    @ApiProperty({ type: String, format: 'uri', nullable: true })
    logoUrl: string | null;

    @ApiProperty({ example: 'America/Sao_Paulo' })
    timezone: string;
}

export class MyAppointmentServiceDto {
    @ApiProperty({ example: 'Corte masculino' })
    name: string;

    @ApiProperty({ example: 50 })
    price: number;

    @ApiProperty({ example: 45 })
    durationMinutes: number;
}

export class MyAppointmentReviewDto {
    @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
    rating: number;

    @ApiProperty({ type: String, nullable: true, example: 'Corte impecável, atendimento pontual.' })
    comment: string | null;

    @ApiProperty({ type: String, nullable: true, description: 'Resposta do negócio.', example: 'Obrigado, Clara! Te esperamos de volta.' })
    reply: string | null;
}

export class MyAppointmentResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ enum: STATUSES })
    status: AppointmentStatus;

    @ApiProperty({ format: 'date-time' })
    startAt: Date;

    @ApiProperty({ format: 'date-time' })
    endAt: Date;

    @ApiProperty({ example: 80 })
    totalPrice: number;

    @ApiProperty({ type: AppointmentPartyDto, nullable: true, description: 'Pacote reservado; `null` em serviços avulsos.' })
    package: AppointmentPartyDto | null;

    @ApiProperty({ type: MyAppointmentBusinessDto })
    business: MyAppointmentBusinessDto;

    @ApiProperty({ type: AppointmentPartyDto, description: '`name` é o nome de exibição do profissional.' })
    professional: AppointmentPartyDto;

    @ApiProperty({ type: [MyAppointmentServiceDto] })
    services: MyAppointmentServiceDto[];

    @ApiProperty({ type: String, nullable: true })
    customerNotes: string | null;

    @ApiProperty({ type: String, nullable: true })
    cancellationReason: string | null;

    @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'Até quando o cliente pode cancelar; `null` se não pode mais.' })
    cancellableUntil: Date | null;

    @ApiProperty({ type: MyAppointmentReviewDto, nullable: true, description: 'Avaliação do cliente; `null` se ainda não avaliou.' })
    review: MyAppointmentReviewDto | null;

    @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'Até quando o cliente pode avaliar ou editar a avaliação; `null` se não pode (não concluído ou prazo encerrado).' })
    reviewableUntil: Date | null;

    static from(appointment: AppointmentEntity, deadlines: { cancellableUntil: Date | null; reviewableUntil: Date | null }): MyAppointmentResponseDto {
        const { business } = appointment.customer;
        const dto = new MyAppointmentResponseDto();
        dto.id = appointment.id;
        dto.status = appointment.status;
        dto.startAt = appointment.startAt;
        dto.endAt = appointment.endAt;
        dto.totalPrice = appointment.totalPrice;
        dto.package = appointment.package && { id: appointment.package.id, name: appointment.package.name };
        dto.business = { name: business.name, slug: business.slug, logoUrl: business.logoKey && storageUrl(business.logoKey), timezone: business.timezone };
        dto.professional = { id: appointment.professional.id, name: appointment.professional.displayName };
        dto.services = appointment.services.map((s) => ({ name: s.service.name, price: s.price, durationMinutes: s.durationMinutes }));
        dto.customerNotes = appointment.customerNotes;
        dto.cancellationReason = appointment.cancellationReason;
        dto.cancellableUntil = deadlines.cancellableUntil;
        const [review] = appointment.reviews ?? [];
        dto.review = review ? { rating: review.rating, comment: review.comment, reply: review.reply } : null;
        dto.reviewableUntil = deadlines.reviewableUntil;
        return dto;
    }
}
