import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class RedisClientService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    const password = this.config.get<string>('REDIS_PASSWORD', '');
    const db = this.config.get<number>('REDIS_DB', 0);

    const url = password
      ? `redis://:${password}@${host}:${port}/${db}`
      : `redis://${host}:${port}/${db}`;

    this.client = createClient({ url }) as RedisClientType;

    this.client.on('error', (err) =>
      this.logger.error('Redis client error', err, 'RedisClientService'),
    );

    await this.client.connect();
    this.logger.log('Redis connected', 'RedisClientService');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit();
  }

  getClient(): RedisClientType {
    return this.client;
  }

  // Session management
  async setSession(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.setEx(key, ttlSeconds, value);
  }

  async getSession(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async deleteSession(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const val = await this.client.incr(key);
    if (ttlSeconds && val === 1) {
      await this.client.expire(key, ttlSeconds);
    }
    return val;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
}
