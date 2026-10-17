import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { ALLOWED_PHOTO_MIME_TYPES } from '../storage/photo-validation.js';
import { AdminRegistrationsController } from './admin-registrations.controller.js';
import { AdminRegistrationsService } from './admin-registrations.service.js';
import { RegistrationsController } from './registrations.controller.js';
import { RegistrationsService } from './registrations.service.js';

@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        // Kept in memory so the bytes can be checked before anything is written.
        storage: memoryStorage(),
        limits: { fileSize: config.uploads.maxBytes, files: 1, fields: 20, fieldSize: 4096 },
        fileFilter: (_req, file, callback) => {
          if ((ALLOWED_PHOTO_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(new BadRequestException('The photo must be a JPEG, PNG or WebP image'), false);
          }
        },
      }),
    }),
  ],
  controllers: [RegistrationsController, AdminRegistrationsController],
  providers: [RegistrationsService, AdminRegistrationsService],
  exports: [RegistrationsService, AdminRegistrationsService],
})
export class RegistrationsModule {}
