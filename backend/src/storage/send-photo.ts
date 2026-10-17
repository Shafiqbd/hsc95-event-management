import { NotFoundException, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import type { PhotoStorageService } from './photo-storage.service.js';

/** Stream a managed photo with safe headers; 404 for anything else. */
export async function sendPhoto(
  storage: PhotoStorageService,
  key: string | null,
  res: Response,
): Promise<StreamableFile> {
  const photo = key && storage.isManagedKey(key) ? await storage.read(key) : null;
  if (!photo) throw new NotFoundException('Photo not found');
  res.set({
    'Content-Type': photo.contentType,
    'Cache-Control': 'private, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  });
  return new StreamableFile(photo.body);
}
