import { HttpStatus, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRequestCookie } from '@nestjs/core/helpers/cookies/request-cookies.js';
import type { Request } from 'express';
import { IsPublic } from '@/common/auth/public.decorator.js';
import type { AuthenticatedRequest } from '../../common/auth/current-user.decorator.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { ACCESS_TOKEN_COOKIE } from './auth-cookies.js';
import { TokenService } from './services/token.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {

    constructor(
        private readonly reflector: Reflector,
        private readonly tokens: TokenService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride(IsPublic, [context.getHandler(), context.getClass()]);
        if (isPublic) {
            return true;
        }

        const req = context.switchToHttp().getRequest<Request>();
        const token = getRequestCookie(req, ACCESS_TOKEN_COOKIE);
        const userId = token ? await this.tokens.verifyAccessToken(token) : null;

        if (!userId) {
            throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, 'Não autenticado.');
        }

        (req as AuthenticatedRequest).user = { id: userId };
        return true;
    }
}
