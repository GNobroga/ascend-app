import { timingSafeEqual } from 'node:crypto';
import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiHeader, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { IsPublic } from '../../common/auth/public.decorator.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { ApiErrorResponse } from '../../common/http/api-docs.js';
import { EVOLUTION_WEBHOOK_SECRET_HEADER, jidToPhone, toWhatsAppStatus } from '../../common/whatsapp/evolution.provider.js';
import { env } from '../../config/env.config.js';
import { EvolutionWebhookDto } from './dto/evolution-webhook.dto.js';
import { WhatsAppConnectionsService } from './whatsapp-connections.service.js';

const CONNECTION_UPDATE = 'connection.update';

const isValidSecret = (received: string | undefined): boolean => {
    const expected = Buffer.from(env.EVOLUTION_WEBHOOK_SECRET);
    const actual = Buffer.from(received ?? '');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
};

@ApiTags('webhooks')
@Controller('/api/webhooks/evolution')
export class EvolutionWebhookController {

    constructor(private readonly connections: WhatsAppConnectionsService) { }

    @Post()
    @IsPublic()
    @SkipThrottle()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Recebe eventos do Evolution API',
        description: 'Uso interno do Evolution. Atualiza o status da conexão do WhatsApp; uma queda só é confirmada, e avisada aos gestores, se durar mais de 2 minutos. Eventos desconhecidos são ignorados.',
    })
    @ApiHeader({ name: EVOLUTION_WEBHOOK_SECRET_HEADER, required: true, description: 'Igual a `EVOLUTION_WEBHOOK_SECRET`.' })
    @ApiNoContentResponse({ description: 'Evento recebido.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Corpo inválido (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Secret ausente ou inválido (`UNAUTHENTICATED`).')
    async receive(@Headers(EVOLUTION_WEBHOOK_SECRET_HEADER) secret: string | undefined, @Body() dto: EvolutionWebhookDto): Promise<void> {
        if (!isValidSecret(secret)) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, 'Webhook não autorizado.');
        }
        if (dto.event !== CONNECTION_UPDATE || typeof dto.data.state !== 'string') {
            return;
        }
        const status = toWhatsAppStatus(dto.data.state);
        const phoneNumber = typeof dto.data.wuid === 'string' ? jidToPhone(dto.data.wuid) : null;
        await this.connections.handleConnectionUpdate(dto.instance, { status, phoneNumber });
    }
}
