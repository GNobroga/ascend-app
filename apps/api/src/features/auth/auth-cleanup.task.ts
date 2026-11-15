import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenService } from './services/token.service.js';
import { UserTokenService } from './services/user-token.service.js';

@Injectable()
export class AuthCleanupTask {

    private readonly logger = new Logger(AuthCleanupTask.name);

    constructor(
        private readonly tokens: TokenService,
        private readonly userTokens: UserTokenService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'auth-cleanup', timeZone: 'America/Sao_Paulo' })
    async deleteExpiredTokens(): Promise<void> {
        try {
            const refreshTokens = await this.tokens.deleteExpired();
            const userTokens = await this.userTokens.deleteExpired();
            this.logger.log(`Tokens expirados apagados: ${refreshTokens} refresh, ${userTokens} de e-mail.`);
        } catch (error) {
            this.logger.error('Falha ao apagar tokens expirados.', error instanceof Error ? error.stack : error);
        }
    }
}
