import { BullModule } from '@nestjs/bullmq';
import { ValidationPipe, type Provider } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '@nestjs/mail';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AppException } from './common/errors/app.exception.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { MailDispatcher } from './common/mail/mail-dispatcher.service.js';
import { mailQueueOptions } from './common/mail/mail-queue.js';
import { mailOptions } from './common/mail/mail.config.js';
import { MailProcessor } from './common/mail/mail.processor.js';
import { createRedisClient } from './common/redis/redis-client.js';
import { StorageService } from './common/storage/storage.service.js';
import { AppThrottlerGuard } from './common/throttling/app-throttler.guard.js';
import { DEFAULT_RATE_LIMIT } from './common/throttling/rate-limit.decorator.js';
import { PostalCodeProvider } from './common/postal-code/postal-code-provider.js';
import { ViaCepProvider } from './common/postal-code/viacep.provider.js';
import { EvolutionProvider } from './common/whatsapp/evolution.provider.js';
import { WhatsAppProvider } from './common/whatsapp/whatsapp-provider.js';
import { env } from './config/env.config.js';
import { entities } from './database/entities/index.js';
import { dataSourceOptions } from './database/typeorm.config.js';
import { JwtAuthGuard } from './features/auth/index.js';

export const infrastructureImports = [
  LoggerModule.forRoot({
    pinoHttp: {
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
    },
  }),
  TypeOrmModule.forRoot({ ...dataSourceOptions, autoLoadEntities: true }),
  TypeOrmModule.forFeature(entities),
  JwtModule.register({
    secret: env.JWT_ACCESS_SECRET,
    signOptions: { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS },
  }),
  MailModule.forRoot(mailOptions),
  BullModule.forRoot({ connection: createRedisClient() }),
  BullModule.registerQueue(mailQueueOptions),
  ScheduleModule.forRoot(),
  EventEmitterModule.forRoot(),
  ThrottlerModule.forRoot({
    throttlers: [{ name: 'default', ...DEFAULT_RATE_LIMIT }],
  }),
];

export const infrastructureProviders: Provider[] = [
  MailDispatcher,
  MailProcessor,
  StorageService,
  { provide: WhatsAppProvider, useClass: EvolutionProvider },
  { provide: PostalCodeProvider, useClass: ViaCepProvider },
  {
    provide: APP_PIPE,
    useValue: new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => AppException.fromValidationErrors(errors),
    }),
  },
  { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  { provide: APP_GUARD, useClass: AppThrottlerGuard },
  { provide: APP_GUARD, useClass: JwtAuthGuard },
];
