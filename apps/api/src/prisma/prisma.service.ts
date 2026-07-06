import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin PrismaClient wrapper wired into the Nest lifecycle. DATABASE_URL is the one
 * hard-required env var (fail fast if absent). Connection is skipped when we're
 * only booting the app to emit the OpenAPI spec (OPENAPI_ONLY=1).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    super();
  }

  async onModuleInit(): Promise<void> {
    if (process.env.OPENAPI_ONLY === '1') return;
    await this.$connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
