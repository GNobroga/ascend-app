import { HttpStatus, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { AppException } from '../../common/errors/app.exception.js';
import { ErrorCode } from '../../common/errors/error-code.enum.js';
import { PostalCodeProvider, PostalCodeProviderError, type PostalCodeAddress } from '../../common/postal-code/postal-code-provider.js';
import { createRedisClient } from '../../common/redis/redis-client.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const FOUND_TTL_MS = 30 * DAY_MS;
const NOT_FOUND_TTL_MS = DAY_MS;
const NOT_FOUND_MARKER = 'not-found';

const cacheKey = (postalCode: string) => `postal-code:${postalCode}`;

@Injectable()
export class PostalCodesService implements OnModuleDestroy {

    private readonly logger = new Logger(PostalCodesService.name);

    private readonly redis = createRedisClient();

    constructor(private readonly provider: PostalCodeProvider) { }

    async onModuleDestroy(): Promise<void> {
        await this.redis.quit();
    }

    async lookup(postalCode: string): Promise<PostalCodeAddress> {
        const address = await this.findCachedOrFetch(postalCode);
        if (!address) {
            throw new AppException(ErrorCode.POSTAL_CODE_NOT_FOUND, HttpStatus.NOT_FOUND, 'CEP não encontrado.');
        }
        return address;
    }

    private async findCachedOrFetch(postalCode: string): Promise<PostalCodeAddress | null> {
        const cached = await this.readCache(postalCode);
        if (cached !== undefined) {
            return cached;
        }

        let address: PostalCodeAddress | null;
        try {
            address = await this.provider.lookup(postalCode);
        } catch (error) {
            if (!(error instanceof PostalCodeProviderError)) {
                throw error;
            }
            this.logger.warn(error.message);
            throw new AppException(ErrorCode.POSTAL_CODE_UNAVAILABLE, HttpStatus.BAD_GATEWAY, 'A consulta de CEP está indisponível. Preencha o endereço manualmente.');
        }

        await this.writeCache(postalCode, address);
        return address;
    }

    private async readCache(postalCode: string): Promise<PostalCodeAddress | null | undefined> {
        try {
            const value = await this.redis.get(cacheKey(postalCode));
            if (value === null) {
                return undefined;
            }
            return value === NOT_FOUND_MARKER ? null : JSON.parse(value) as PostalCodeAddress;
        } catch (error) {
            this.logger.warn(`Falha ao ler o cache do CEP ${postalCode}: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    }

    private async writeCache(postalCode: string, address: PostalCodeAddress | null): Promise<void> {
        try {
            await (address
                ? this.redis.set(cacheKey(postalCode), JSON.stringify(address), 'PX', FOUND_TTL_MS)
                : this.redis.set(cacheKey(postalCode), NOT_FOUND_MARKER, 'PX', NOT_FOUND_TTL_MS));
        } catch (error) {
            this.logger.warn(`Falha ao gravar o cache do CEP ${postalCode}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
