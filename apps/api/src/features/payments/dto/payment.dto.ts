import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, IsUUID, Max, MaxDate, MaxLength, Min } from 'class-validator';
import { PaymentStatus } from '../../../common/enums/payment-status.enum.js';
import type { PaymentEntity } from '../../../database/entities/payment.entity.js';

const MAX_AMOUNT = 99_999_999.99;
const NOTES_MAX_LENGTH = 1000;
const REASON_MAX_LENGTH = 500;
const PAID_AT_TOLERANCE_MS = 5 * 60 * 1000;

export class CreatePaymentDto {
    @ApiProperty({ format: 'uuid', description: 'Forma de pagamento ativa do negócio.' })
    @IsUUID()
    paymentMethodId: string;

    @ApiProperty({ description: 'Valor recebido em reais, até 2 casas decimais; não pode passar do saldo do agendamento.', minimum: 0.01, maximum: MAX_AMOUNT, example: 40 })
    @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
    @Min(0.01)
    @Max(MAX_AMOUNT)
    amount: number;

    @ApiPropertyOptional({ type: String, nullable: true, maxLength: NOTES_MAX_LENGTH, example: 'Sinal pago no Pix.' })
    @IsOptional()
    @IsString()
    @MaxLength(NOTES_MAX_LENGTH)
    notes?: string | null;

    @ApiPropertyOptional({ format: 'date-time', description: 'Quando o dinheiro foi recebido, para pagamentos lançados depois; não pode estar no futuro. Sem o campo, vale o momento do lançamento.', example: '2026-10-22T18:30:00.000Z' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    @MaxDate(() => new Date(Date.now() + PAID_AT_TOLERANCE_MS), { message: 'A data do recebimento não pode estar no futuro.' })
    paidAt?: Date;
}

export class PaymentActionDto {
    @ApiPropertyOptional({ type: String, nullable: true, maxLength: REASON_MAX_LENGTH, description: 'Motivo; é acrescentado às observações do pagamento.', example: 'Cliente desistiu e o sinal foi devolvido.' })
    @IsOptional()
    @IsString()
    @MaxLength(REASON_MAX_LENGTH)
    reason?: string | null;
}

export class PaymentMethodRefDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ example: 'Pix' })
    name: string;
}

export class PaymentResponseDto {
    @ApiProperty({ format: 'uuid' })
    id: string;

    @ApiProperty({ description: 'Valor em reais.', example: 40 })
    amount: number;

    @ApiProperty({
        enum: Object.values(PaymentStatus),
        description: '`paid`: recebido. `refunded`: devolvido ao cliente. `cancelled`: lançamento desfeito. `pending` e `failed` ficam para o pagamento online.',
        example: PaymentStatus.PAID,
    })
    status: PaymentStatus;

    @ApiProperty({ type: PaymentMethodRefDto })
    paymentMethod: PaymentMethodRefDto;

    @ApiProperty({ type: String, nullable: true, example: 'Sinal pago no Pix.' })
    notes: string | null;

    @ApiProperty({ format: 'date-time', description: 'Quando o dinheiro foi recebido; é a data usada no "Recebido" dos indicadores.' })
    paidAt: Date;

    @ApiProperty({ format: 'date-time', description: 'Quando o pagamento foi lançado.' })
    createdAt: Date;

    @ApiProperty({ format: 'date-time', description: 'Última mudança: lançamento, estorno ou cancelamento.' })
    updatedAt: Date;

    static from(payment: PaymentEntity): PaymentResponseDto {
        const dto = new PaymentResponseDto();
        dto.id = payment.id;
        dto.amount = payment.amount;
        dto.status = payment.status;
        dto.paymentMethod = { id: payment.paymentMethod.id, name: payment.paymentMethod.name };
        dto.notes = payment.notes;
        dto.paidAt = payment.paidAt;
        dto.createdAt = payment.createdAt;
        dto.updatedAt = payment.updatedAt;
        return dto;
    }
}
