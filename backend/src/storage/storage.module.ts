import { Global, Module } from '@nestjs/common';
import { PhotoStorageService } from './photo-storage.service.js';

@Global()
@Module({
  providers: [PhotoStorageService],
  exports: [PhotoStorageService],
})
export class StorageModule {}
