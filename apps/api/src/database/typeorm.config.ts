import { DataSourceOptions } from 'typeorm';
import { env } from '../config/env.config.js';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  database: env.DATABASE_NAME,
  username: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  entities: [`${import.meta.dirname}/entities/*.entity.{ts,js}`],
  migrations: [`${import.meta.dirname}/migrations/*.{ts,js}`],
  migrationsTableName: 'migrations',
  synchronize: false,
};
