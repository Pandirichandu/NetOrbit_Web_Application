import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { RedisClientService } from './redis-client.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        store: 'redis',
        host: config.get<string>('REDIS_HOST'),
        port: config.get<number>('REDIS_PORT'),
        password: config.get<string>('REDIS_PASSWORD') || undefined,
        db: config.get<number>('REDIS_DB', 0),
        ttl: 300, // default 5 minutes
      }),
    }),
  ],
  providers: [RedisClientService],
  exports: [RedisClientService],
})
export class CacheModule {}
