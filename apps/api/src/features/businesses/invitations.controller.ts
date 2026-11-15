import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { IsPublic } from '../../common/auth/public.decorator.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { RateLimit } from '../../common/throttling/rate-limit.decorator.js';
import { BusinessInvitationsService } from './business-invitations.service.js';
import { InvitationPreviewResponseDto, InvitationTokenDto } from './dto/business-invitation.dto.js';
import { MyBusinessResponseDto } from './dto/my-business-response.dto.js';

const MINUTE_MS = 60 * 1000;
const INVALID_TOKEN = 'Dados inválidos (`VALIDATION_ERROR`) ou convite inválido, expirado, revogado ou já usado (`INVALID_INVITATION_TOKEN`).';
const UNAUTHENTICATED = 'Access token ausente ou inválido (`UNAUTHENTICATED`).';
const EMAIL_MISMATCH = 'O convite é de outro e-mail (`INVITATION_EMAIL_MISMATCH`).';

/** O token vai no body, e não na URL, para não aparecer nos logs de requisição. */
@ApiTags('invitations')
@Controller('/api/invitations')
export class InvitationsController {

    constructor(private readonly invitations: BusinessInvitationsService) { }

    @IsPublic()
    @Post('lookup')
    @HttpCode(HttpStatus.OK)
    @RateLimit(10, MINUTE_MS)
    @ApiOperation({ summary: 'Consulta um convite pelo token', description: 'Usado pela tela `/accept-invitation` antes do login, para mostrar o negócio e os papéis.' })
    @ApiDataResponse(InvitationPreviewResponseDto)
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_TOKEN)
    async lookup(@Body() dto: InvitationTokenDto): Promise<ApiResponse<InvitationPreviewResponseDto>> {
        return ApiResponse.of(InvitationPreviewResponseDto.from(await this.invitations.getByToken(dto.token)));
    }

    @Post('accept')
    @HttpCode(HttpStatus.OK)
    @RateLimit(10, MINUTE_MS)
    @ApiCookieAuth()
    @ApiOperation({
        summary: 'Aceita um convite',
        description: 'O usuário autenticado precisa ter o e-mail do convite. Cria o vínculo `active` com os papéis do convite (ou restaura um removido) e marca o e-mail como verificado.',
    })
    @ApiDataResponse(MyBusinessResponseDto, { description: 'Negócio em que o usuário entrou, com os papéis dele.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_TOKEN)
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    @ApiErrorResponse(HttpStatus.FORBIDDEN, EMAIL_MISMATCH)
    @ApiErrorResponse(HttpStatus.CONFLICT, 'O usuário já é membro do negócio (`MEMBER_ALREADY_EXISTS`).')
    async accept(@CurrentUser('id') userId: string, @Body() dto: InvitationTokenDto): Promise<ApiResponse<MyBusinessResponseDto>> {
        return ApiResponse.of(MyBusinessResponseDto.from(await this.invitations.accept(dto.token, userId)));
    }

    @Post('decline')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RateLimit(10, MINUTE_MS)
    @ApiCookieAuth()
    @ApiOperation({ summary: 'Recusa um convite', description: 'O usuário autenticado precisa ter o e-mail do convite. O link deixa de funcionar.' })
    @ApiNoContentResponse({ description: 'Convite recusado.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, INVALID_TOKEN)
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, UNAUTHENTICATED)
    @ApiErrorResponse(HttpStatus.FORBIDDEN, EMAIL_MISMATCH)
    async decline(@CurrentUser('id') userId: string, @Body() dto: InvitationTokenDto): Promise<void> {
        await this.invitations.decline(dto.token, userId);
    }
}
