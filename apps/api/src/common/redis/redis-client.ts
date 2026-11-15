import { Redis } from 'ioredis';
import { env } from '../../config/env.config.js';


export const createRedisClient = (): Redis =>
    new Redis({ host: env.REDIS_HOST, port: env.REDIS_PORT, password: env.REDIS_PASSWORD, maxRetriesPerRequest: null });
