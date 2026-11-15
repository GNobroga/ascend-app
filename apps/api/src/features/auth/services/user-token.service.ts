import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, MoreThan, Repository } from 'typeorm';
import type { UserTokenType } from '../../../common/enums/user-token-type.enum.js';
import { UserTokenEntity } from '../../../database/entities/user-token.entity.js';
import { generateOpaqueToken, hashOpaqueToken } from '../../../common/utilities/opaque-token.js';

/** Tokens de uso único enviados por e-mail. */
@Injectable()
export class UserTokenService {

    constructor(@InjectRepository(UserTokenEntity) private readonly tokens: Repository<UserTokenEntity>) { }

    async issue(userId: string, type: UserTokenType, ttlMs: number): Promise<string> {
        const raw = generateOpaqueToken();

        await this.tokens.manager.transaction(async (manager) => {
            const repo = manager.getRepository(UserTokenEntity);
            await repo.delete({ user: { id: userId }, type, usedAt: IsNull() });
            await repo.save(repo.create({
                type,
                tokenHash: hashOpaqueToken(raw),
                expiresAt: new Date(Date.now() + ttlMs),
                user: { id: userId },
            }));
        });

        return raw;
    }

    async consume(rawToken: string, type: UserTokenType): Promise<string | null> {
        const result = await this.tokens.createQueryBuilder()
            .update()
            .set({ usedAt: () => 'now()' })
            .where('"tokenHash" = :hash AND "type" = :type AND "usedAt" IS NULL AND "expiresAt" > now()', { hash: hashOpaqueToken(rawToken), type })
            .returning('"userId"')
            .execute();
        return (result.raw as { userId: string }[])[0]?.userId ?? null;
    }

    async verify(rawToken: string, type: UserTokenType): Promise<string | null> {
        const token = await this.tokens.findOne({
            where: { tokenHash: hashOpaqueToken(rawToken), type, expiresAt: MoreThan(new Date()) },
            relations: { user: true },
        });
        if (!token?.user) {
            return null;
        }
        if (!token.usedAt) {
            await this.tokens.update({ id: token.id }, { usedAt: new Date() });
        }
        return token.user.id;
    }

    async deleteExpired(): Promise<number> {
        const result = await this.tokens.delete({ expiresAt: LessThan(new Date()) });
        return result.affected ?? 0;
    }
}
