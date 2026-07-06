import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageConfig } from '../../config/configuration';

export interface StoredObject {
  buffer: Buffer;
  contentType: string;
}

/**
 * Object storage seam, backed by Cloudflare R2 (S3-compatible) in live mode.
 *
 * Same stub/live philosophy as SetuClient: `isStub()` keeps objects in an in-memory
 * map so the app runs with zero storage credentials, and flips to R2 the moment
 * R2_* env vars are supplied. Writes are best-effort from the caller's perspective —
 * storage is a secondary copy / cache, never the source of truth for eSign state.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly memory = new Map<string, StoredObject>();
  private cachedClient: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  private get storage(): StorageConfig {
    return this.config.get<StorageConfig>('storage')!;
  }

  isStub(): boolean {
    return this.storage.provider !== 'r2';
  }

  async put(key: string, buffer: Buffer, contentType: string): Promise<void> {
    if (this.isStub()) {
      this.memory.set(key, { buffer, contentType });
      this.logger.log(`[stub] stored ${key} (${buffer.length} bytes)`);
      return;
    }
    await this.client().send(
      new PutObjectCommand({
        Bucket: this.storage.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Stored ${key} in R2 (${buffer.length} bytes)`);
  }

  async get(key: string): Promise<StoredObject | null> {
    if (this.isStub()) {
      return this.memory.get(key) ?? null;
    }
    try {
      const res = await this.client().send(
        new GetObjectCommand({ Bucket: this.storage.bucket, Key: key }),
      );
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) return null;
      return {
        buffer: Buffer.from(bytes),
        contentType: res.ContentType ?? 'application/octet-stream',
      };
    } catch (err) {
      this.logger.warn(`R2 get ${key} failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  private client(): S3Client {
    if (this.cachedClient) return this.cachedClient;
    const { endpoint, region, accessKeyId, secretAccessKey } = this.storage;
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 storage requires R2_ENDPOINT, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY');
    }
    this.cachedClient = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
    return this.cachedClient;
  }
}
