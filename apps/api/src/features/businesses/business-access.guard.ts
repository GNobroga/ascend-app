import { HttpStatus, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isUUID } from 'class-validator';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { BUSINESS_ID_PARAM, BusinessRoles, FullAccessRequired, type BusinessRequest } from './business-membership.js';
import { BusinessSubscriptionsService } from './business-subscriptions.service.js';
import { BusinessesService } from './businesses.service.js';

@Injectable()
export class BusinessAccessGuard implements CanActivate {

    constructor(
        private readonly reflector: Reflector,
        private readonly businesses: BusinessesService,
        private readonly subscriptions: BusinessSubscriptionsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<BusinessRequest>();
        const businessId = req.params[BUSINESS_ID_PARAM];

        // Não membro recebe 404, e não 403, para não revelar quais negócios existem.
        const membership = typeof businessId === 'string' && isUUID(businessId)
            ? await this.businesses.findActiveMembership(businessId, req.user.id)
            : null;
        if (!membership) {
            throw BusinessesService.notFound();
        }

        const required = this.reflector.getAllAndOverride(BusinessRoles, [context.getHandler(), context.getClass()]) ?? [];
        if (required.length && !required.some((role) => membership.roles.includes(role))) {
            throw new AppException(ErrorCode.INSUFFICIENT_BUSINESS_ROLE, HttpStatus.FORBIDDEN, 'Papel insuficiente neste negócio.');
        }

        if (this.reflector.getAllAndOverride(FullAccessRequired, [context.getHandler(), context.getClass()])) {
            await this.subscriptions.ensureFullAccess(membership.businessId);
        }

        req.membership = membership;
        return true;
    }
}
