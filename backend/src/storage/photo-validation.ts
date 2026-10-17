export const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type PhotoExtension = 'jpg' | 'png' | 'webp';

/**
 * Detect the real image format from the file's magic bytes. The declared
 * MIME type and original filename are never trusted on their own.
 */
export function detectImageType(buffer: Buffer): PhotoExtension | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

const EXTENSION_TO_MIME: Record<PhotoExtension, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function mimeForExtension(ext: PhotoExtension): string {
  return EXTENSION_TO_MIME[ext];
}

/** Declared MIME type must match the detected content. */
export function declaredTypeMatches(declared: string, detected: PhotoExtension): boolean {
  return declared.toLowerCase() === EXTENSION_TO_MIME[detected];
}
