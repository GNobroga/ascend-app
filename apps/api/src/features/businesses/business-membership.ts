import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../common/auth/current-user.decorator.js';
import type { BusinessMemberRole } from '../../common/enums/business-member-role.enum.js';

export const BUSINESS_ID_PARAM = 'businessId';

/** Vínculo ativo do usuário autenticado com o negócio da rota. */
export interface BusinessMembership {
    id: string;
    businessId: string;
    roles: BusinessMemberRole[];
}

export type BusinessRequest = AuthenticatedRequest & { membership: BusinessMembership };

export const BusinessRoles = Reflector.createDecorator<BusinessMemberRole[]>();

export const FullAccessRequired = Reflector.createDecorator<boolean>();
