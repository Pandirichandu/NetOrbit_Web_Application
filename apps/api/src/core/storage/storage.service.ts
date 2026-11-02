import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: Minio.Client;
  private bucket: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'netorbit');

    this.client = new Minio.Client({
      endPoint: this.config.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: this.config.get<number>('MINIO_PORT', 9000),
      useSSL: this.config.get<boolean>('MINIO_USE_SSL', false),
      accessKey: this.config.get<string>('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.config.get<string>('MINIO_SECRET_KEY', 'minioadmin'),
    });

    // Ensure bucket exists
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`MinIO bucket '${this.bucket}' created`, 'StorageService');
      } else {
        this.logger.log(`MinIO bucket '${this.bucket}' exists`, 'StorageService');
      }
    } catch (err) {
      this.logger.warn(
        `MinIO not available: ${(err as Error).message}. File uploads will fail.`,
        'StorageService',
      );
    }
  }

  async upload(
    objectName: string,
    buffer: Buffer,
    mimeType: string,
    tenantId: string,
  ): Promise<string> {
    const key = `${tenantId}/${objectName}`;
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return key;
  }

  async getPresignedUrl(objectKey: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }

  async delete(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }
}
