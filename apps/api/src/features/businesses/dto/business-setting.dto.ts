import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDivisibleBy, IsInt, IsNumber, Max, Min } from 'class-validator';
import { IsOptionalNotNull } from '../../../common/validation/is-optional-not-null.decorator.js';
import type { BusinessSettingEntity } from '../../../database/entities/business-setting.entity.js';

const MAX_UNBLOCK_FEE = 10000;

export class UpdateBusinessSettingDto {
    @ApiPropertyOptional({ description: 'Antecedência mínima, em horas, para o cliente cancelar.', minimum: 0, maximum: 720, example: 24 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(0)
    @Max(720)
    cancellationLimitHours?: number;

    @ApiPropertyOptional({ description: 'Antecedência mínima, em minutos, para agendar; menor que `maximumAdvanceBookingDays`.', minimum: 0, maximum: 43200, example: 60 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(0)
    @Max(43200)
    minimumAdvanceBookingMinutes?: number;

    @ApiPropertyOptional({ description: 'Antecedência máxima, em dias, para agendar.', minimum: 1, maximum: 365, example: 30 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(1)
    @Max(365)
    maximumAdvanceBookingDays?: number;

    @ApiPropertyOptional({ description: 'Intervalo, em minutos, entre os horários oferecidos; múltiplo de 5.', minimum: 5, maximum: 240, multipleOf: 5, example: 30 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(5)
    @Max(240)
    @IsDivisibleBy(5)
    slotIntervalMinutes?: number;

    @ApiPropertyOptional({ description: 'Intervalo, em minutos, livre entre um atendimento e outro do mesmo profissional (limpeza, preparo); `0` desliga. Múltiplo de 5.', minimum: 0, maximum: 120, multipleOf: 5, example: 10 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(0)
    @Max(120)
    @IsDivisibleBy(5)
    bufferMinutes?: number;

    @ApiPropertyOptional({ description: 'Taxa, em reais, para o cliente sair de um bloqueio por taxa. Vale para os bloqueios aplicados depois da mudança.', minimum: 0, maximum: MAX_UNBLOCK_FEE, example: 50 })
    @IsOptionalNotNull()
    @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
    @Min(0)
    @Max(MAX_UNBLOCK_FEE)
    unblockFee?: number;

    @ApiPropertyOptional({ description: 'Agendamentos feitos pelo cliente nascem `confirmed`; desligado, nascem `pending` e a equipe confirma.', example: true })
    @IsOptionalNotNull()
    @IsBoolean()
    autoConfirmOnlineBookings?: boolean;

    @ApiPropertyOptional({ description: 'Antecedência, em horas, do lembrete por e-mail ao cliente; `0` desliga. Vale para os lembretes ainda não enviados.', minimum: 0, maximum: 168, example: 24 })
    @IsOptionalNotNull()
    @IsInt()
    @Min(0)
    @Max(168)
    reminderHoursBefore?: number;
}

export class BusinessSettingResponseDto {
    @ApiProperty({ description: 'Antecedência mínima, em horas, para o cliente cancelar.', example: 24 })
    cancellationLimitHours: number;

    @ApiProperty({ description: 'Antecedência mínima, em minutos, para agendar.', example: 60 })
    minimumAdvanceBookingMinutes: number;

    @ApiProperty({ description: 'Antecedência máxima, em dias, para agendar.', example: 30 })
    maximumAdvanceBookingDays: number;

    @ApiProperty({ description: 'Intervalo, em minutos, entre os horários oferecidos.', example: 30 })
    slotIntervalMinutes: number;

    @ApiProperty({ description: 'Intervalo, em minutos, livre entre um atendimento e outro do mesmo profissional; `0` = desligado.', example: 10 })
    bufferMinutes: number;

    @ApiProperty({ description: 'Taxa, em reais, para o cliente sair de um bloqueio por taxa.', example: 50 })
    unblockFee: number;

    @ApiProperty({ description: 'Agendamentos feitos pelo cliente nascem `confirmed`.', example: true })
    autoConfirmOnlineBookings: boolean;

    @ApiProperty({ description: 'Antecedência, em horas, do lembrete por e-mail ao cliente; `0` = desligado.', example: 24 })
    reminderHoursBefore: number;

    static from(setting: BusinessSettingEntity): BusinessSettingResponseDto {
        const dto = new BusinessSettingResponseDto();
        dto.cancellationLimitHours = setting.cancellationLimitHours;
        dto.minimumAdvanceBookingMinutes = setting.minimumAdvanceBookingMinutes;
        dto.maximumAdvanceBookingDays = setting.maximumAdvanceBookingDays;
        dto.slotIntervalMinutes = setting.slotIntervalMinutes;
        dto.bufferMinutes = setting.bufferMinutes;
        dto.unblockFee = setting.unblockFee;
        dto.autoConfirmOnlineBookings = setting.autoConfirmOnlineBookings;
        dto.reminderHoursBefore = setting.reminderHoursBefore;
        return dto;
    }
}
