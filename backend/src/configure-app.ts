import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import type { AppConfig } from './config/app-config.js';

/** Shared by main.ts and the HTTP tests so both run the same pipeline. */
export function configureApp(app: INestApplication, config: Pick<AppConfig, 'frontendUrl'>): void {
  const express = app as NestExpressApplication;
  express.disable('x-powered-by');
  // Behind a reverse proxy (Nginx in production): trust one hop for client IPs (rate limiting).
  express.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  // The frontend is on another origin (e.g. :3000 → :4000, or hsc95society.com →
  // api.hsc95society.com) and shows member photos served by this API.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  app.enableCors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'X-Requested-With'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );
}
