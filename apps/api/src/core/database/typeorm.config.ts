import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : path.resolve(process.cwd(), 'src/core/database');

dotenv.config({ path: path.resolve(currentDir, '../../../.env') });
dotenv.config({ path: path.resolve(currentDir, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  username: process.env.DB_USER || 'netorbit_user',
  password: process.env.DB_PASSWORD || 'netorbit_password',
  database: process.env.DB_NAME || 'netorbit',
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
  entities: [
    path.join(currentDir, '../../modules/**/*.entity{.ts,.js}'),
    path.join(currentDir, '../../core/**/*.entity{.ts,.js}'),
  ],
  migrations: [path.join(currentDir, '../../migrations/*{.ts,.js}')],
  migrationsTableName: 'migrations',
});

