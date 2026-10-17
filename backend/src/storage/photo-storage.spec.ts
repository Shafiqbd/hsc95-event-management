import { rm } from 'node:fs/promises';
import { JPEG, testConfig } from '../../test/helpers.js';
import { PhotoStorageService } from './photo-storage.service.js';
import { declaredTypeMatches, detectImageType } from './photo-validation.js';

describe('photo validation', () => {
  it('detects formats from magic bytes', () => {
    expect(detectImageType(JPEG)).toBe('jpg');
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
    expect(detectImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'ascii'))).toBe('webp');
    expect(detectImageType(Buffer.from('GIF89a'))).toBeNull();
    expect(detectImageType(Buffer.from('<script>'))).toBeNull();
  });

  it('requires the declared MIME type to match the content', () => {
    expect(declaredTypeMatches('image/jpeg', 'jpg')).toBe(true);
    expect(declaredTypeMatches('image/png', 'jpg')).toBe(false);
  });
});

describe('PhotoStorageService', () => {
  const config = testConfig();
  const storage = new PhotoStorageService(config);
  afterAll(() => rm(config.uploads.dir, { recursive: true, force: true }));

  it('stores under a server-generated name and reads it back', async () => {
    const key = await storage.save(JPEG, 'jpg');
    expect(key).toMatch(/^photos\/[0-9a-f-]{36}\.jpg$/);
    expect(storage.isManagedKey(key)).toBe(true);
    await expect(storage.read(key)).resolves.toMatchObject({ contentType: 'image/jpeg' });
    await storage.remove(key);
    await expect(storage.read(key)).resolves.toBeNull();
  });

  it('refuses path traversal and foreign paths', async () => {
    expect(storage.keyFromFileName('../../.env')).toBeNull();
    expect(storage.keyFromFileName('..%2F.env')).toBeNull();
    expect(storage.isManagedKey('photos/../../secret.jpg')).toBe(false);
    expect(storage.isManagedKey('C:\\photos\\a.jpg')).toBe(false);
    await expect(storage.read('../package.json')).resolves.toBeNull();
  });
});
