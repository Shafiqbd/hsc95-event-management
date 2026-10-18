import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { buildDataSourceOptions } from './data-source-options.js';

/** Provides the TypeORM DataSource that services inject. */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => buildDataSourceOptions(config),
    }),
  ],
})
export class DatabaseModule {}
