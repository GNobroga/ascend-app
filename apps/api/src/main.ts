import { env } from './config/env.config.js';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { ACCESS_TOKEN_COOKIE } from './features/auth/index.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  app.enableCors({ origin: env.FRONTEND_URL, credentials: true });

  if (env.NODE_ENV === 'development') {
    const config = new DocumentBuilder()
      .setTitle('API')
      .setVersion('1.0')
      .addCookieAuth(ACCESS_TOKEN_COOKIE)
      .build();
    SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config));
  }

  await app.listen(env.PORT);
}
await bootstrap();
