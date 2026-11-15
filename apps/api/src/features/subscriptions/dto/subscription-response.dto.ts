import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus } from '../../../common/enums/subscription-status.enum.js';
import { ACTIVATION_BONUS_DAYS, type SubscriptionAccess } from '../../businesses/index.js';
import type { ActivationSteps, SubscriptionOverview } from '../subscriptions.service.js';

const ACCESS_LEVELS: SubscriptionAccess[] = ['full', 'restricted'];

export class ActivationStepsDto {
    @ApiProperty({ description: 'Horário de funcionamento cadastrado.', example: true })
    businessHours: boolean;

    @ApiProperty({ description: 'Pelo menos um serviço ativo.', example: true })
    services: boolean;

    @ApiProperty({ description: 'Pelo menos um profissional ativo, com expediente e ligado a um serviço ou pacote.', example: false })
    professionals: boolean;

    @ApiProperty({ description: 'Pelo menos um agendamento criado, pela equipe ou pelo cliente.', example: false })
    firstAppointment: boolean;

    static from(steps: ActivationSteps): ActivationStepsDto {
        const dto = new ActivationStepsDto();
        dto.businessHours = steps.businessHours;
        dto.services = steps.services;
        dto.professionals = steps.professionals;
        dto.firstAppointment = steps.firstAppointment;
        return dto;
    }
}

export class ActivationDto {
    @ApiProperty({ type: ActivationStepsDto })
    steps: ActivationStepsDto;

    @ApiProperty({ description: 'Dias somados ao teste quando o primeiro agendamento é criado dentro dele.', example: ACTIVATION_BONUS_DAYS })
    bonusDays: number;

    @ApiProperty({ type: String, format: 'date-time', nullable: true, description: 'Quando o bônus foi concedido; `null` se ainda não foi.' })
    bonusGrantedAt: Date | null;
}

export class SubscriptionResponseDto {
    @ApiProperty({ enum: Object.values(SubscriptionStatus), description: '`trialing`: em teste; `active`: assinatura em dia.' })
    status: SubscriptionStatus;

    @ApiProperty({ enum: ACCESS_LEVELS, description: '`restricted` bloqueia agendamento online, novos agendamentos pela equipe, convites e WhatsApp.' })
    access: SubscriptionAccess;

    @ApiProperty({ format: 'date-time', description: 'Fim do teste, já com o bônus de ativação, se concedido.' })
    trialEndsAt: Date;

    @ApiProperty({ type: ActivationDto })
    activation: ActivationDto;

    static from({ subscription, access, activationSteps }: SubscriptionOverview): SubscriptionResponseDto {
        const dto = new SubscriptionResponseDto();
        dto.status = subscription.status;
        dto.access = access;
        dto.trialEndsAt = subscription.trialEndsAt;
        dto.activation = {
            steps: ActivationStepsDto.from(activationSteps),
            bonusDays: ACTIVATION_BONUS_DAYS,
            bonusGrantedAt: subscription.activationBonusGrantedAt,
        };
        return dto;
    }
}
