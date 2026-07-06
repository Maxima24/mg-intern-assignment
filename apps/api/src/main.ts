import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap(): Promise<void> {
  // rawBody:true preserves the exact webhook bytes for HMAC verification.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const config = app.get(ConfigService);
  const corsOrigins = config.get<string[]>('app.corsOrigins') ?? [];
  const port = config.get<number>('app.port') ?? 4000;

  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true });
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mango eSign API')
    .setDescription('Backend for Setu Aadhaar eSign — the only tier that talks to Setu.')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'api/openapi.json' });

  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(
    `Mango eSign API listening on http://localhost:${port} · docs at /docs · Setu provider: ${config.get(
      'setu.provider',
    )}`,
  );
}

void bootstrap();
