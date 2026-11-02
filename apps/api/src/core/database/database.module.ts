import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        ssl: config.get<boolean>('DB_SSL') ? { rejectUnauthorized: false } : false,
        synchronize: false, // Always use migrations
        logging: config.get<boolean>('DB_LOGGING') ? ['query', 'error'] : ['error'],
        autoLoadEntities: true,
        poolSize: config.get<number>('DB_POOL_SIZE', 20),
        connectTimeoutMS: 5000,
        extra: {
          max: config.get<number>('DB_POOL_SIZE', 20),
          min: 2,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
