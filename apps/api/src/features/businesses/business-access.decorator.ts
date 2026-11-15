import { applyDecorators, createParamDecorator, HttpStatus, UseGuards, type ExecutionContext } from '@nestjs/common';
import { ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import type { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';
import { ApiErrorResponse } from '../../common/http/api-docs.js';
import { BusinessAccessGuard } from './business-access.guard.js';
import { BUSINESS_ID_PARAM, BusinessRoles, FullAccessRequired, type BusinessMembership, type BusinessRequest } from './business-membership.js';

/**
 * Exige que o usuário seja membro ativo do negócio em `:businessId` e, se `roles` for informado, que tenha ao menos um deles.
 * Documenta o parâmetro e os erros 401/403/404 no Swagger.
 */
export const BusinessAccess = (...roles: BusinessMemberRole[]) => applyDecorators(
    BusinessRoles(roles),
    UseGuards(BusinessAccessGuard),
    ApiCookieAuth(),
    ApiParam({ name: BUSINESS_ID_PARAM, format: 'uuid', description: 'Id do negócio.' }),
    ApiErrorResponse(HttpStatus.UNAUTHORIZED, 'Access token ausente ou inválido (`UNAUTHENTICATED`).'),
    ApiErrorResponse(HttpStatus.NOT_FOUND, 'Negócio não existe ou o usuário não é membro ativo dele (`BUSINESS_NOT_FOUND`).'),
    ...(roles.length ? [ApiErrorResponse(HttpStatus.FORBIDDEN, `Exige o papel ${roles.map((r) => `\`${r}\``).join(' ou ')} (\`INSUFFICIENT_BUSINESS_ROLE\`).`)] : []),
);

export const SUBSCRIPTION_RESTRICTED_DOC = 'Assinatura do negócio sem acesso completo, como teste vencido (`SUBSCRIPTION_RESTRICTED`).';

export const RequiresFullAccess = () => applyDecorators(
    FullAccessRequired(true),
    ApiErrorResponse(HttpStatus.PAYMENT_REQUIRED, SUBSCRIPTION_RESTRICTED_DOC),
);

export const CurrentMembership = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): BusinessMembership => ctx.switchToHttp().getRequest<BusinessRequest>().membership,
);
