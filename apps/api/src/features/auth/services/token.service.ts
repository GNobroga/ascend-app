import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { env } from '../../../config/env.config.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { ErrorCode } from '../../../common/errors/error-code.enum.js';
import { RefreshTokenEntity } from '../../../database/entities/refresh-token.entity.js';
import { generateOpaqueToken, hashOpaqueToken } from '../../../common/utilities/opaque-token.js';

export interface SessionTokens {
    accessToken: string;
    refreshToken: string;
}

interface AccessTokenPayload {
    sub: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TokenService {

    constructor(
        private readonly jwt: JwtService,
        @InjectRepository(RefreshTokenEntity) private readonly refreshTokens: Repository<RefreshTokenEntity>,
    ) { }

    async openSession(userId: string, currentRefreshToken?: string): Promise<SessionTokens> {
        if (currentRefreshToken) {
            await this.revokeSession(currentRefreshToken);
        }

        const { raw } = await this.saveRefreshToken(this.refreshTokens, userId, randomUUID());
        return { accessToken: await this.signAccessToken(userId), refreshToken: raw };
    }

    async verifyAccessToken(token: string): Promise<string | null> {
        try {
            const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
            return payload.sub ?? null;
        } catch {
            return null;
        }
    }

    async rotate(rawToken: string): Promise<SessionTokens> {
        const current = await this.refreshTokens.findOne({
            where: { tokenHash: hashOpaqueToken(rawToken) },
            relations: { user: true },
        });

        if (!current || !current.user) {
            throw TokenService.invalidRefreshToken();
        }
        if (current.revokedAt) {
            await this.revokeFamily(current.familyId);
            throw TokenService.invalidRefreshToken();
        }
        if (current.expiresAt <= new Date()) {
            throw TokenService.invalidRefreshToken();
        }

        const userId = current.user.id;

        const next = await this.refreshTokens.manager.transaction(async (manager) => {
            const repo = manager.getRepository(RefreshTokenEntity);

            const claimed = await repo.update({ id: current.id, revokedAt: IsNull() }, { revokedAt: new Date() });
            if (!claimed.affected) {
                return null;
            }

            const issued = await this.saveRefreshToken(repo, userId, current.familyId);
            await repo.update({ id: current.id }, { replacedBy: { id: issued.entity.id } });
            return issued.raw;
        });

        if (!next) {
            await this.revokeFamily(current.familyId);
            throw TokenService.invalidRefreshToken();
        }

        return { accessToken: await this.signAccessToken(userId), refreshToken: next };
    }

    async revokeSession(rawToken: string): Promise<void> {
        const token = await this.refreshTokens.findOneBy({ tokenHash: hashOpaqueToken(rawToken) });
        if (token) {
            await this.revokeFamily(token.familyId);
        }
    }

    async revokeAllSessions(userId: string): Promise<void> {
        await this.refreshTokens.update({ user: { id: userId }, revokedAt: IsNull() }, { revokedAt: new Date() });
    }

    /** Apaga refresh tokens expirados. Revogados ainda válidos ficam: são eles que detectam reuso. */
    async deleteExpired(): Promise<number> {
        const result = await this.refreshTokens.delete({ expiresAt: LessThan(new Date()) });
        return result.affected ?? 0;
    }

    private signAccessToken(userId: string): Promise<string> {
        return this.jwt.signAsync({ sub: userId } satisfies AccessTokenPayload);
    }

    private async saveRefreshToken(
        repo: Repository<RefreshTokenEntity>,
        userId: string,
        familyId: string,
    ): Promise<{ raw: string; entity: RefreshTokenEntity }> {
        const raw = generateOpaqueToken();
        const entity = await repo.save(repo.create({
            tokenHash: hashOpaqueToken(raw),
            familyId,
            expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
            user: { id: userId },
        }));
        return { raw, entity };
    }

    private async revokeFamily(familyId: string): Promise<void> {
        await this.refreshTokens.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() });
    }

    private static invalidRefreshToken(): AppException {
        return new AppException(ErrorCode.INVALID_REFRESH_TOKEN, HttpStatus.UNAUTHORIZED, 'Sessão inválida ou expirada.');
    }
}
