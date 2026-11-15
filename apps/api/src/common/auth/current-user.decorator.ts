import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
}

export type AuthenticatedRequest = Request & { user: AuthUser };

export const CurrentUser = createParamDecorator<keyof AuthUser | undefined>(
  (key: keyof AuthUser | undefined, ctx: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] => {
    const { user } = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return key ? user[key] : user;
  },
);
