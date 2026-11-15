import { Body, Controller, Cookies, Get, HttpCode, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiCookieAuth, ApiFoundResponse, ApiNoContentResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import { IsPublic } from '../../common/auth/public.decorator.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { ApiDataResponse, ApiErrorResponse } from '../../common/http/api-docs.js';
import { ApiResponse } from '../../common/http/api-response.js';
import { RateLimit } from '../../common/throttling/rate-limit.decorator.js';
import { env } from '../../config/env.config.js';
import { UserResponseDto } from '../users/index.js';
import { AuthCookies, OAUTH_GOOGLE_COOKIE, OAUTH_GOOGLE_REDIRECT_COOKIE, REFRESH_TOKEN_COOKIE } from './auth-cookies.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { GoogleAuthService } from './services/google.service.js';

const MINUTE_MS = 60 * 1000;
const MAX_REDIRECT_PATH_LENGTH = 2048;

@ApiTags('auth')
@Controller('/api/auth')
export class AuthController {

    constructor(
        private readonly auth: AuthService,
        private readonly google: GoogleAuthService,
        private readonly cookies: AuthCookies,
        private readonly adapterHost: HttpAdapterHost,
    ) { }

    @IsPublic()
    @Post('register')
    @RateLimit(5, 15 * MINUTE_MS)
    @ApiOperation({ summary: 'Cadastra usuário com e-mail e senha', description: 'Abre a sessão nos cookies httpOnly `access_token` e `refresh_token`. Se o navegador já tiver um `refresh_token`, a sessão anterior é revogada. Envia em segundo plano o e-mail de verificação; o login não depende dela.' })
    @ApiDataResponse(UserResponseDto, { status: HttpStatus.CREATED, description: 'Usuário criado e sessão aberta.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, 'E-mail já cadastrado (`EMAIL_ALREADY_IN_USE`).')
    async register(
        @Body() dto: RegisterDto,
        @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | undefined,
        @Res({ passthrough: true }) res: Response,
    ): Promise<ApiResponse<UserResponseDto>> {
        const { user, session } = await this.auth.register(dto, refreshToken);
        this.cookies.setSession(res, session);
        return ApiResponse.of(UserResponseDto.from(user));
    }

    @IsPublic()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @RateLimit(5, MINUTE_MS)
    @ApiOperation({ summary: 'Login com e-mail e senha', description: 'Abre a sessão nos cookies httpOnly. Se o navegador já tiver um `refresh_token`, a sessão anterior é revogada.' })
    @ApiDataResponse(UserResponseDto, { description: 'Sessão aberta.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'E-mail ou senha inválidos (`INVALID_CREDENTIALS`).')
    async login(
        @Body() dto: LoginDto,
        @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | undefined,
        @Res({ passthrough: true }) res: Response,
    ): Promise<ApiResponse<UserResponseDto>> {
        const { user, session } = await this.auth.login(dto, refreshToken);
        this.cookies.setSession(res, session);
        return ApiResponse.of(UserResponseDto.from(user));
    }

    @IsPublic()
    @Post('refresh')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Renova a sessão', description: 'Lê o cookie `refresh_token`, revoga-o e grava novos `access_token` e `refresh_token`. Reuso de um token já revogado derruba a sessão inteira.' })
    @ApiNoContentResponse({ description: 'Sessão renovada.' })
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Refresh token ausente, inválido, expirado ou reusado (`INVALID_REFRESH_TOKEN`); os cookies são limpos.')
    async refresh(@Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | undefined, @Res({ passthrough: true }) res: Response): Promise<void> {
        try {
            this.cookies.setSession(res, await this.auth.refresh(refreshToken));
        } catch (error) {
            this.cookies.clearSession(res);
            throw error;
        }
    }

    @IsPublic()
    @Post('logout')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Encerra a sessão', description: 'Revoga a sessão do cookie `refresh_token` (se houver) e limpa os cookies. Idempotente.' })
    @ApiNoContentResponse({ description: 'Sessão encerrada.' })
    async logout(@Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | undefined, @Res({ passthrough: true }) res: Response): Promise<void> {
        await this.auth.logout(refreshToken);
        this.cookies.clearSession(res);
    }

    @Post('change-password')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RateLimit(5, 15 * MINUTE_MS)
    @ApiCookieAuth()
    @ApiOperation({ summary: 'Troca a senha', description: 'Em conta sem senha (só Google), cria a senha sem pedir a atual. Revoga todas as sessões do usuário, inclusive em outros dispositivos, e grava uma sessão nova nos cookies httpOnly.' })
    @ApiNoContentResponse({ description: 'Senha alterada e sessão renovada.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`) ou senha atual incorreta ou ausente (`INVALID_CURRENT_PASSWORD`).')
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Access token ausente ou inválido (`UNAUTHENTICATED`).')
    async changePassword(
        @CurrentUser('id') userId: string,
        @Body() dto: ChangePasswordDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<void> {
        this.cookies.setSession(res, await this.auth.changePassword(userId, dto));
    }

    @Post('verify-email/resend')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RateLimit(3, 15 * MINUTE_MS)
    @ApiCookieAuth()
    @ApiOperation({ summary: 'Reenvia o e-mail de verificação', description: 'Envia em segundo plano um novo link e invalida o anterior.' })
    @ApiNoContentResponse({ description: 'Envio agendado.' })
    @ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Access token ausente ou inválido (`UNAUTHENTICATED`).')
    @ApiErrorResponse(HttpStatus.CONFLICT, 'E-mail já verificado (`EMAIL_ALREADY_VERIFIED`).')
    async resendEmailVerification(@CurrentUser('id') userId: string): Promise<void> {
        await this.auth.resendEmailVerification(userId);
    }

    @IsPublic()
    @Get('verify-email')
    @ApiOperation({ summary: 'Confirma o e-mail', description: 'Link enviado por e-mail; abrir no navegador. Sucesso: redireciona para `FRONTEND_URL/email-verified`. Falha: redireciona para `FRONTEND_URL/login?error=INVALID_VERIFICATION_TOKEN`. O link pode ser reaberto até expirar.' })
    @ApiQuery({ name: 'token', required: false })
    @ApiFoundResponse({ description: 'Redireciona para o frontend.' })
    async verifyEmail(@Query('token') token: string | undefined, @Res() res: Response): Promise<void> {
        try {
            await this.auth.verifyEmail(token);
            this.redirect(res, new URL('/email-verified', env.FRONTEND_URL).toString());
        } catch (err) {
            const failure = new URL('/login', env.FRONTEND_URL);
            failure.searchParams.set('error', err instanceof AppException ? err.code : ErrorCode.INVALID_VERIFICATION_TOKEN);
            this.redirect(res, failure.toString());
        }
    }

    @IsPublic()
    @Post('forgot-password')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RateLimit(3, 15 * MINUTE_MS)
    @ApiOperation({ summary: 'Pede a redefinição de senha', description: 'Se houver conta com o e-mail, envia em segundo plano um link para `FRONTEND_URL/reset-password?token=<token>` e invalida links anteriores. A resposta é a mesma exista a conta ou não.' })
    @ApiNoContentResponse({ description: 'Pedido recebido.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`).')
    forgotPassword(@Body() dto: ForgotPasswordDto): void {
        this.auth.forgotPassword(dto);
    }

    @IsPublic()
    @Post('reset-password')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RateLimit(5, MINUTE_MS)
    @ApiOperation({ summary: 'Redefine a senha', description: 'Troca a senha usando o token do e-mail (uso único) e marca o e-mail como verificado. Também cria a primeira senha de conta só-Google. Revoga todas as sessões do usuário e limpa os cookies; o usuário precisa entrar de novo.' })
    @ApiNoContentResponse({ description: 'Senha redefinida.' })
    @ApiErrorResponse(HttpStatus.BAD_REQUEST, 'Dados inválidos (`VALIDATION_ERROR`) ou token inválido, expirado ou já usado (`INVALID_RESET_TOKEN`).')
    async resetPassword(@Body() dto: ResetPasswordDto, @Res({ passthrough: true }) res: Response): Promise<void> {
        await this.auth.resetPassword(dto);
        this.cookies.clearSession(res);
    }

    @IsPublic()
    @Get('google')
    @ApiOperation({
        summary: 'Inicia o login com Google',
        description: 'Grava o cookie `oauth_google` (state + PKCE) e redireciona para o Google. Abrir no navegador, não via XHR. '
            + '`redirectTo` (caminho relativo do frontend) volta no redirect final para `FRONTEND_URL/auth/callback` ou `FRONTEND_URL/login`; valor que não seja caminho relativo é ignorado.',
    })
    @ApiQuery({ name: 'redirectTo', required: false, description: 'Caminho do frontend para onde voltar depois do login.', example: '/barbearia-do-joao/book' })
    @ApiFoundResponse({ description: 'Redireciona para o consentimento do Google.' })
    async googleRedirect(@Query('redirectTo') redirectTo: string | undefined, @Res() res: Response): Promise<void> {
        const { url, state, codeVerifier } = await this.google.createAuthorizationRequest();
        this.cookies.setOAuthGoogle(res, { state, codeVerifier }, AuthController.safeRedirectPath(redirectTo));
        this.redirect(res, url);
    }

    @IsPublic()
    @Get('google/callback')
    @ApiOperation({ summary: 'Callback do Google', description: 'Chamado pelo Google. Sucesso: abre a sessão e redireciona para `FRONTEND_URL/auth/callback`. Falha: redireciona para `FRONTEND_URL/login?error=<CODE>` com `OAUTH_DENIED`, `OAUTH_STATE_MISMATCH`, `OAUTH_FAILED`, `GOOGLE_EMAIL_NOT_VERIFIED` ou `EMAIL_ALREADY_IN_USE`. Nos dois casos repassa o `redirectTo` recebido no início do login.' })
    @ApiQuery({ name: 'code', required: false })
    @ApiQuery({ name: 'state', required: false })
    @ApiQuery({ name: 'error', required: false })
    @ApiFoundResponse({ description: 'Redireciona para o frontend.' })
    async googleCallback(
        @Query('code') code: string | undefined,
        @Query('state') state: string | undefined,
        @Query('error') error: string | undefined,
        @Cookies(OAUTH_GOOGLE_COOKIE) oauthCookie: string | undefined,
        @Cookies(OAUTH_GOOGLE_REDIRECT_COOKIE) redirectCookie: string | undefined,
        @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string | undefined,
        @Res() res: Response,
    ): Promise<void> {
        this.cookies.clearOAuthGoogle(res);
        const redirectTo = AuthController.safeRedirectPath(redirectCookie);

        try {
            if (error) {
                throw new AppException(ErrorCode.OAUTH_DENIED, HttpStatus.UNAUTHORIZED, 'Acesso negado no Google.');
            }

            const stored = AuthCookies.parseOAuthGoogle(oauthCookie);
            if (!stored || !state || !code || !AuthController.safeEqual(stored.state, state)) {
                throw new AppException(ErrorCode.OAUTH_STATE_MISMATCH, HttpStatus.UNAUTHORIZED, 'State inválido.');
            }

            const profile = await this.google.getProfile(code, stored.codeVerifier);
            if (!profile) {
                throw new AppException(ErrorCode.OAUTH_FAILED, HttpStatus.UNAUTHORIZED, 'Falha na autenticação com o Google.');
            }

            const { session } = await this.auth.loginWithGoogle(profile, refreshToken);
            this.cookies.setSession(res, session);
            const success = new URL('/auth/callback', env.FRONTEND_URL);
            if (redirectTo) success.searchParams.set('redirectTo', redirectTo);
            this.redirect(res, success.toString());
        } catch (err) {
            const failure = new URL('/login', env.FRONTEND_URL);
            failure.searchParams.set('error', err instanceof AppException ? err.code : ErrorCode.OAUTH_FAILED);
            if (redirectTo) failure.searchParams.set('redirectTo', redirectTo);
            this.redirect(res, failure.toString());
        }
    }

    private redirect(res: Response, url: string): void {
        this.adapterHost.httpAdapter.redirect(res, HttpStatus.FOUND, url);
    }

    private static safeRedirectPath(value: string | undefined): string | null {
        if (!value || value.length > MAX_REDIRECT_PATH_LENGTH) return null;
        return value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : null;
    }

    private static safeEqual(a: string, b: string): boolean {
        const left = Buffer.from(a);
        const right = Buffer.from(b);
        return left.length === right.length && timingSafeEqual(left, right);
    }
}
