import 'reflect-metadata';
import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

const NODE_ENVS = ['development', 'production', 'test'] as const;
type NodeEnv = (typeof NODE_ENVS)[number];

export class EnvConfig {
  @IsIn(NODE_ENVS)
  NODE_ENV: NodeEnv;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  DATABASE_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  DATABASE_PORT: number = 5432;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  GOOGLE_CLIENT_SECRET: string;

  @IsUrl({ require_tld: false })
  GOOGLE_REDIRECT_URI: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  @Type(() => Number)
  @IsInt()
  @Min(60)
  ACCESS_TOKEN_TTL_SECONDS: number = 900;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  REFRESH_TOKEN_TTL_DAYS: number = 10;

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;

  /** URL pública da API, usada em links enviados por e-mail. */
  @IsUrl({ require_tld: false })
  API_URL: string;

  @IsString()
  EMAIL_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  EMAIL_PORT: number = 587;

  @IsString()
  EMAIL_USERNAME: string;

  @IsString()
  EMAIL_PASSWORD: string;

  /** Remetente; aceita `"Nome" <email>`. */
  @IsString()
  EMAIL_FROM: string;

  /** TLS implícito (porta 465). Com `false`, a conexão exige STARTTLS. */
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  EMAIL_TLS_ENABLED: boolean = false;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  EMAIL_VERIFICATION_TTL_HOURS: number = 24;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  PASSWORD_RESET_TTL_MINUTES: number = 60;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  BUSINESS_INVITATION_TTL_DAYS: number = 7;

  @Transform(({ value }) => value === undefined ? true : value === true || value === 'true')
  @IsBoolean()
  COOKIE_SECURE: boolean = true;

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  /** Endpoint da API S3 (RustFS, R2, GCS etc.). */
  @IsUrl({ require_tld: false })
  STORAGE_ENDPOINT: string;

  @IsString()
  STORAGE_REGION: string = 'us-east-1';

  @IsString()
  STORAGE_BUCKET: string;

  @IsString()
  STORAGE_ACCESS_KEY: string;

  @IsString()
  STORAGE_SECRET_KEY: string;

  /** Base das URLs públicas dos objetos (ex.: `https://files.dominio.com/bucket`). */
  @IsUrl({ require_tld: false })
  STORAGE_PUBLIC_URL: string;

  /** `true` para servidores que só aceitam `endpoint/bucket/key` (RustFS sem `RUSTFS_SERVER_DOMAINS`). */
  @Transform(({ value }) => value === undefined ? true : value === true || value === 'true')
  @IsBoolean()
  STORAGE_FORCE_PATH_STYLE: boolean = true;

  @IsString()
  REDIS_HOST: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  @IsString()
  @MinLength(16)
  REDIS_PASSWORD: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  MAIL_RATE_LIMIT_MAX: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  MAIL_RATE_LIMIT_DURATION_MS: number = 1000;

  @IsUrl({ require_tld: false })
  EVOLUTION_API_URL: string;

  @IsString()
  @MinLength(32)
  EVOLUTION_API_KEY: string;

  @IsUrl({ require_tld: false })
  EVOLUTION_WEBHOOK_URL: string;

  @IsString()
  @MinLength(32)
  EVOLUTION_WEBHOOK_SECRET: string;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  WHATSAPP_MIN_INTERVAL_MS: number = 8000;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  WHATSAPP_MAX_INTERVAL_MS: number = 20000;

  @IsUrl({ require_tld: false })
  VIACEP_URL: string = 'https://viacep.com.br/ws/';

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  BILLING_ENFORCEMENT_ENABLED: boolean = false;
}

export const validateEnv = (raw: Record<string, unknown>): EnvConfig => {
  const config = plainToInstance(EnvConfig, raw);
  
  const errors = validateSync(config, { whitelist: true });

  if (errors.length > 0) {
    const details = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${details}`);
  }

  return config;
};

try {
  process.loadEnvFile('.env');
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}

export const env = validateEnv(process.env);
