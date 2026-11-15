import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { BUSINESS_ID_PARAM, BusinessAccess, RequiresFullAccess } from '../businesses/index.js';
import { ConnectWhatsAppDto, UpdateWhatsAppConnectionDto, WhatsAppConnectionResponseDto } from './dto/whatsapp-connection.dto.js';
import { WhatsAppConnectionsService, type WhatsAppConnectionView } from './whatsapp-connections.service.js';

const MANAGERS = [BusinessMemberRole.OWNER, BusinessMemberRole.ADMIN];
const NOT_FOUND = 'O WhatsApp ainda não foi conectado neste negócio (`WHATSAPP_CONNECTION_NOT_FOUND`).';
const UNAVAILABLE = 'O serviço de WhatsApp não respondeu (`WHATSAPP_UNAVAILABLE`).';

const toResponse = ({ connection, qrCode }: WhatsAppConnectionView): ApiResponse<WhatsAppConnectionResponseDto> =>
    ApiResponse.of(WhatsAppConnectionResponseDto.from(connection, qrCode));

@ApiTags('whatsapp')
@Controller(`/api/businesses/:${BUSINESS_ID_PARAM}/whatsapp`)
export class WhatsAppConnectionsController {

    constructor(private readonly connections: WhatsAppConnectionsService) { }

    @Get()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({
        summary: 'Consulta a conexão do WhatsApp',
        description: 'Sincroniza o status com o WhatsApp. Enquanto `status` é `connecting`, traz um QR code novo; o cliente deve consultar de novo a cada poucos segundos até conectar.',
    })
    @ApiDataResponse(WhatsAppConnectionResponseDto)
    @ApiErrorResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
    @ApiErrorResponse(HttpStatus.BAD_GATEWAY, UNAVAILABLE)
    async get(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<ApiResponse<WhatsAppConnectionResponseDto>> {
        return toResponse(await this.connections.get(businessId));
    }

    @Post()
    @HttpCode(HttpStatus.OK)
    @BusinessAccess(...MANAGERS)
    @RequiresFullAccess()
    @ApiOperation({
        summary: 'Conecta o WhatsApp do negócio',
        description: 'Cria a conexão, ou retoma uma desconectada, e devolve o QR code para escanear em "Aparelhos conectados" no WhatsApp do negócio. Registra o aceite dos termos.',
    })
    @ApiDataResponse(WhatsAppConnectionResponseDto, { description: 'Conexão aguardando a leitura do QR code.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, '`acceptTerms` ausente ou diferente de `true` (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, 'O WhatsApp já está conectado (`WHATSAPP_ALREADY_CONNECTED`).')
    @ApiErrorResponse(HttpStatus.BAD_GATEWAY, UNAVAILABLE)
    async connect(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() _dto: ConnectWhatsAppDto): Promise<ApiResponse<WhatsAppConnectionResponseDto>> {
        return toResponse(await this.connections.connect(businessId));
    }

    @Patch()
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Liga ou desliga o envio de mensagens', description: 'Não desconecta o número.' })
    @ApiDataResponse(WhatsAppConnectionResponseDto, { description: 'Conexão atualizada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
    async update(@Param(BUSINESS_ID_PARAM) businessId: string, @Body() dto: UpdateWhatsAppConnectionDto): Promise<ApiResponse<WhatsAppConnectionResponseDto>> {
        return toResponse(await this.connections.update(businessId, dto));
    }

    @Delete()
    @HttpCode(HttpStatus.NO_CONTENT)
    @BusinessAccess(...MANAGERS)
    @ApiOperation({ summary: 'Desconecta o WhatsApp', description: 'Encerra a sessão no aparelho e apaga a conexão; para voltar a enviar, é preciso conectar de novo.' })
    @ApiNoContentResponse({ description: 'WhatsApp desconectado.' })
    @ApiErrorResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
    @ApiErrorResponse(HttpStatus.BAD_GATEWAY, UNAVAILABLE)
    async disconnect(@Param(BUSINESS_ID_PARAM) businessId: string): Promise<void> {
        await this.connections.disconnect(businessId);
    }
}
