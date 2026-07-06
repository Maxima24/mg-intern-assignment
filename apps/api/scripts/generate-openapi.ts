/**
 * Emits apps/api/openapi.json from the NestJS Swagger document. This file is the
 * single source of truth the web app's types are generated from:
 *   pnpm --filter api openapi          # this script
 *   pnpm --filter @mango/shared types:gen
 *
 * OPENAPI_ONLY=1 makes PrismaService skip $connect, so we can build the spec
 * without a running database.
 */
process.env.OPENAPI_ONLY = '1';
process.env.DATABASE_URL ??= 'postgresql://user:pass@localhost:5432/placeholder';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api', { exclude: ['health'] });

  const config = new DocumentBuilder()
    .setTitle('Mango eSign API')
    .setDescription('Backend for Setu Aadhaar eSign — the only tier that talks to Setu.')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outPath = join(__dirname, '..', 'openapi.json');
  writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();

  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath}`);
}

void main();
